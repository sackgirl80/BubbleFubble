const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { sendPhoto, sendMessage, sendPoll, sendQuiz, deleteMessage, setMessageReaction, getUpdatesLongPoll } = require('./lib/telegram');
const { loadChatHistory, addMessage } = require('./lib/chat-history');
const { generateReply, generateText, getApiKey, getProvider, BASE_PROMPT, BASE_TOOLS } = require('./lib/ai');
const { fetchRandomAnimal } = require('./lib/sources');
const { loadHistory, isAlreadySent, recordSent } = require('./lib/history');
const { isRegistered, registerUser, getUser, updateUser, getAllChatIds } = require('./lib/users');
const fm = require('./lib/feature-manager');

const ISSUES_LOG = path.join(__dirname, 'logs', 'issues.log');

function logIssue(chatId, userText, error) {
  const entry = {
    timestamp: new Date().toISOString(),
    chatId,
    userText: userText?.substring(0, 200),
    error: error?.message || String(error),
    stack: error?.stack?.split('\n').slice(0, 3).join(' | '),
  };
  try {
    fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });
    fs.appendFileSync(ISSUES_LOG, JSON.stringify(entry) + '\n');
  } catch {}
  console.error(`[${entry.timestamp}] [${chatId}] ISSUE: ${entry.error}`);
}

async function notifyUserOfError(chatId) {
  try {
    await sendMessage(BOT_TOKEN, chatId,
      'Hmm, da ist etwas schiefgelaufen bei meiner Antwort — sorry! 🙈 Ich habe den Fehler intern gespeichert, damit er behoben werden kann.'
    );
  } catch {}
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PEXELS_KEY = process.env.PEXELS_API_KEY;

if (!BOT_TOKEN || BOT_TOKEN === 'your_bot_token_here') {
  console.error('Set TELEGRAM_BOT_TOKEN in .env');
  process.exit(1);
}

// Load features
fm.loadFeatures();
console.log(`AI provider (default): ${getProvider()}`);
console.log(`Loaded ${fm.loadFeatures().length} features`);

let running = true;

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  running = false;
});
process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  running = false;
});

function resolveAiKey(chatId) {
  const user = getUser(chatId);
  if (user?.aiKey) return user.aiKey;
  // If user has an explicit provider, use the env key for that provider
  if (user?.aiProvider) {
    const envKeys = {
      anthropic: process.env.ANTHROPIC_API_KEY,
      grok: process.env.GROK_API_KEY,
      groq: process.env.GROQ_API_KEY,
    };
    return envKeys[user.aiProvider] || getApiKey();
  }
  return getApiKey();
}

function resolveProvider(chatId) {
  const user = getUser(chatId);
  if (user?.aiProvider) return user.aiProvider;
  return getProvider();
}

function makeCtx(chatId) {
  const aiKey = resolveAiKey(chatId);
  const provider = resolveProvider(chatId);
  return {
    botToken: BOT_TOKEN,
    chatId,
    aiKey,
    aiProvider: provider,
    pexelsKey: PEXELS_KEY,
    sendMessage,
    sendPhoto,
    sendPoll,
    sendQuiz,
    setMessageReaction,
    generateText: (prompt) => generateText(aiKey, prompt, provider),
  };
}

async function fetchAndSendPhoto(chatId) {
  const photoHistory = loadHistory(chatId);
  let photo = null;
  for (let i = 0; i < 10; i++) {
    const candidate = await fetchRandomAnimal(PEXELS_KEY);
    if (!isAlreadySent(photoHistory, candidate.id)) {
      photo = candidate;
      break;
    }
  }
  if (photo) {
    await sendPhoto(BOT_TOKEN, chatId, photo.url, '');
    recordSent(chatId, photoHistory, photo);
    console.log(`[${new Date().toISOString()}] [${chatId}] BubbleFubble: [photo: ${photo.source}/${photo.id} (${photo.animal})]`);
    const ctx = makeCtx(chatId);
    ctx.animal = photo.animal;
    await fm.runHook('afterPhoto', ctx);
    return true;
  }
  return false;
}

async function handleToolCall(chatId, toolName, args, chatHistory, userText) {
  const aiKey = resolveAiKey(chatId);
  const provider = resolveProvider(chatId);

  if (toolName === 'send_photo') {
    const sent = await fetchAndSendPhoto(chatId);
    if (!sent) {
      await sendMessage(BOT_TOKEN, chatId, 'Hmm, ich konnte gerade kein neues Foto finden... versuch es gleich nochmal! 🙈');
    }
    addMessage(chatId, chatHistory, 'user', userText);
    // Log a natural response — avoid mentioning tools/actions as the AI mimics that text
    addMessage(chatId, chatHistory, 'model', sent
      ? 'I sent you a cute animal photo!'
      : 'Sorry, I could not find a new photo right now.');
    return;
  }

  if (toolName === 'list_features') {
    const list = fm.getFeatureList(chatId);
    const lines = list.map(
      (f) => `${f.enabled ? '✅' : '❌'} ${f.name} — ${f.description}`
    );
    const msg = '🔧 Features:\n\n' + lines.join('\n');
    await sendMessage(BOT_TOKEN, chatId, msg);
    addMessage(chatId, chatHistory, 'user', userText);
    addMessage(chatId, chatHistory, 'model', msg);
    return;
  }

  if (toolName === 'toggle_feature') {
    const newState = fm.toggle(chatId, args.feature_id);
    if (newState === null) {
      await sendMessage(BOT_TOKEN, chatId, `Feature "${args.feature_id}" not found.`);
    } else {
      const feature = fm.getFeatureList(chatId).find((f) => f.id === args.feature_id);
      const name = feature?.name || args.feature_id;
      const msg = newState
        ? `✅ ${name} is now enabled!`
        : `❌ ${name} is now disabled.`;
      await sendMessage(BOT_TOKEN, chatId, msg);
      addMessage(chatId, chatHistory, 'user', userText);
      addMessage(chatId, chatHistory, 'model', msg);
    }
    return;
  }

  // Check feature-specific tools
  const feature = fm.findFeatureForTool(chatId, toolName);
  if (feature && typeof feature.handleTool === 'function') {
    const ctx = makeCtx(chatId);
    ctx.loadFeatureData = () => fm.getFeatureData(chatId, feature.id);
    ctx.saveFeatureData = (data) => fm.setFeatureData(chatId, feature.id, data);
    ctx.getFeatureData = (fId) => fm.getFeatureData(chatId, fId);
    ctx.getProvider = () => resolveProvider(chatId);
    ctx.loadPhotoHistory = () => loadHistory(chatId);
    const result = await feature.handleTool(toolName, args, ctx);
    if (result) {
      const reply = await generateText(
        aiKey,
        `You just performed an action: ${result}. ` +
        `The user said: "${userText}". Write a short, friendly confirmation ` +
        `in the same language the user used. 1-2 sentences max. Use emoji.`,
        provider
      );
      if (reply) {
        await sendMessage(BOT_TOKEN, chatId, reply);
        addMessage(chatId, chatHistory, 'user', userText);
        addMessage(chatId, chatHistory, 'model', reply);
      }
    }
    return;
  }

  console.warn(`Unknown tool call: ${toolName}`);
}

async function handlePollAnswer(pollAnswer) {
  const guessFeature = require('./features/guess-the-animal');
  if (typeof guessFeature.onPollAnswer !== 'function') return;

  // Find which user owns this poll
  const allChatIds = getAllChatIds();
  for (const chatId of allChatIds) {
    fm.loadConfig(chatId);
    const guessData = fm.getFeatureData(chatId, 'guess_the_animal');
    if (guessData.pendingGuess?.pollId === pollAnswer.poll_id) {
      const ctx = makeCtx(chatId);
      ctx.pollId = pollAnswer.poll_id;
      ctx.optionIds = pollAnswer.option_ids;
      ctx.loadFeatureData = () => fm.getFeatureData(chatId, 'guess_the_animal');
      ctx.saveFeatureData = (data) => fm.setFeatureData(chatId, 'guess_the_animal', data);
      ctx.recordSent = (photo) => {
        const history = loadHistory(chatId);
        recordSent(chatId, history, photo);
      };
      ctx.runAfterPhoto = async (animal) => {
        const hookCtx = makeCtx(chatId);
        hookCtx.animal = animal;
        await fm.runHook('afterPhoto', hookCtx);
      };

      try {
        await guessFeature.onPollAnswer(ctx);
        console.log(`[${new Date().toISOString()}] [${chatId}] Guess poll answered`);
      } catch (err) {
        logIssue(chatId, '[poll answer]', err);
        await notifyUserOfError(chatId);
      }
      break;
    }
  }
}

async function main() {
  console.log(`[${new Date().toISOString()}] BubbleFubble bot listening...`);

  let offset;

  while (running) {
    let updates;
    try {
      updates = await getUpdatesLongPoll(BOT_TOKEN, offset, 30);
    } catch (err) {
      if (err.name === 'TimeoutError' || err.message.includes('aborted due to timeout')) {
        continue;
      }
      console.error('Polling error:', err.message);
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }

    for (const update of updates) {
      offset = update.update_id + 1;

      // Handle poll answers (e.g. guess the animal)
      if (update.poll_answer) {
        await handlePollAnswer(update.poll_answer);
        continue;
      }

      const msg = update.message;
      if (!msg || (!msg.text && !msg.poll)) continue;

      const chatId = String(msg.chat.id);
      const userName = msg.from?.first_name || 'User';

      // Handle /start — register new users
      if (msg.text === '/start') {
        const isNew = registerUser(chatId, userName);
        fm.loadConfig(chatId);
        const greeting = isNew
          ? `Willkommen bei BubbleFubble, ${userName}! 🎉🐾\n\nIch schicke dir jeden Morgen ein süßes Tierfoto und chatte gern mit dir! Schreib mir einfach eine Nachricht.`
          : `Willkommen zurück, ${userName}! 🐾`;
        await sendMessage(BOT_TOKEN, chatId, greeting);
        console.log(`[${new Date().toISOString()}] [${chatId}] ${isNew ? 'New user' : 'Returning user'}: ${userName}`);
        continue;
      }

      // Require registration
      if (!isRegistered(chatId)) {
        await sendMessage(BOT_TOKEN, chatId, 'Sende /start um loszulegen! 🐾');
        continue;
      }

      // Handle /setkey — per-user API key
      if (msg.text && msg.text.startsWith('/setkey')) {
        // Delete the message containing the key for security
        await deleteMessage(BOT_TOKEN, chatId, msg.message_id);
        const parts = msg.text.slice(7).trim().split(/\s+/);
        if (parts[0] === 'clear') {
          updateUser(chatId, { aiProvider: null, aiKey: null });
          await sendMessage(BOT_TOKEN, chatId, '🔑 Using shared API key now.');
        } else if (parts.length === 2 && ['anthropic', 'grok', 'groq'].includes(parts[0])) {
          updateUser(chatId, { aiProvider: parts[0], aiKey: parts[1] });
          await sendMessage(BOT_TOKEN, chatId, `🔑 API key set for ${parts[0]}. Your message with the key has been deleted for security.`);
        } else {
          await sendMessage(BOT_TOKEN, chatId,
            '🔑 Usage:\n/setkey <provider> <key>\n/setkey clear\n\nProviders: anthropic, grok, groq');
        }
        console.log(`[${new Date().toISOString()}] [${chatId}] /setkey command`);
        continue;
      }

      // Ensure config is loaded for this user
      fm.loadConfig(chatId);

      // Handle polls (Umfrage) — bots can't vote, so reply with a text message
      if (msg.poll) {
        const question = msg.poll.question;
        const options = msg.poll.options.map((o) => o.text);
        const optionsList = options.map((o, i) => `${i + 1}) ${o}`).join(' ');
        console.log(`[${new Date().toISOString()}] [${chatId}] ${userName}: [poll] ${question} — ${optionsList}`);

        try {
          const aiKey = resolveAiKey(chatId);
          const provider = resolveProvider(chatId);
          const prompt =
            `${userName} sent you a poll/Umfrage: "${question}". ` +
            `The options are: ${optionsList}. ` +
            `Pick one option and explain your choice briefly (1-2 sentences). ` +
            `Be playful and fun. Use emoji. Reply in the same language as the question.`;
          const reply = await generateText(aiKey, prompt, provider);
          if (reply) {
            await sendMessage(BOT_TOKEN, chatId, reply);
            console.log(`[${new Date().toISOString()}] [${chatId}] BubbleFubble: ${reply}`);
            const chatHistory = loadChatHistory(chatId);
            addMessage(chatId, chatHistory, 'user', `[Poll: ${question} — ${optionsList}]`);
            addMessage(chatId, chatHistory, 'model', reply);
          }
        } catch (err) {
          logIssue(chatId, `[Poll: ${question}]`, err);
          await notifyUserOfError(chatId);
        }
        continue;
      }

      const userText = msg.text;
      console.log(`[${new Date().toISOString()}] [${chatId}] ${userName}: ${userText}`);

      // Run onMessage hooks for features that need to track user activity
      const msgCtx = makeCtx(chatId);
      msgCtx.userName = userName;
      msgCtx.userText = userText;
      msgCtx.messageId = msg.message_id;
      await fm.runHook('onMessage', msgCtx);

      try {
        const chatHistory = loadChatHistory(chatId);
        const aiKey = resolveAiKey(chatId);
        const provider = resolveProvider(chatId);

        // Build dynamic prompt and tools from enabled features
        const systemPrompt = fm.buildSystemPrompt(chatId, BASE_PROMPT);
        const tools = fm.buildTools(chatId, BASE_TOOLS);

        const result = await generateReply(aiKey, chatHistory, userText, systemPrompt, tools, provider);
        console.log(
          `[${new Date().toISOString()}] [${chatId}] AI decision: ${result.type}` +
          (result.toolName ? ` (${result.toolName})` : '') +
          (result.text ? ` -> ${result.text.substring(0, 80)}` : '')
        );

        if (result.type === 'tool_call') {
          await handleToolCall(chatId, result.toolName, result.args, chatHistory, userText);
        } else {
          await sendMessage(BOT_TOKEN, chatId, result.text);
          console.log(`[${new Date().toISOString()}] [${chatId}] BubbleFubble: ${result.text}`);
          addMessage(chatId, chatHistory, 'user', userText);
          addMessage(chatId, chatHistory, 'model', result.text);
        }
      } catch (err) {
        logIssue(chatId, userText, err);
        await notifyUserOfError(chatId);
      }
    }
  }

  console.log('Bot stopped.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

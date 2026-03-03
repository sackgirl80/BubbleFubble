const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { sendPhoto, sendMessage, sendPoll, sendQuiz, getUpdatesLongPoll } = require('./lib/telegram');
const { loadChatHistory, addMessage } = require('./lib/chat-history');
const { generateReply, generateText, BASE_PROMPT, BASE_TOOLS } = require('./lib/ai');
const { fetchRandomAnimal } = require('./lib/sources');
const { loadHistory, isAlreadySent, recordSent } = require('./lib/history');
const fm = require('./lib/feature-manager');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const GROQ_KEY = process.env.GROQ_API_KEY;
const PEXELS_KEY = process.env.PEXELS_API_KEY;

if (!BOT_TOKEN || BOT_TOKEN === 'your_bot_token_here') {
  console.error('Set TELEGRAM_BOT_TOKEN in .env');
  process.exit(1);
}
if (!CHAT_ID || CHAT_ID === 'your_chat_id_here') {
  console.error('Set TELEGRAM_CHAT_ID in .env');
  process.exit(1);
}
if (!GROQ_KEY || GROQ_KEY === 'your_groq_api_key_here') {
  console.error('Set GROQ_API_KEY in .env (free at https://console.groq.com/keys)');
  process.exit(1);
}

// Load features
fm.loadFeatures();
fm.loadConfig();
console.log(
  `Loaded ${fm.getFeatureList().length} features (${fm.getFeatureList().filter((f) => f.enabled).length} enabled)`
);

let running = true;

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  running = false;
});
process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  running = false;
});

function makeCtx() {
  return {
    botToken: BOT_TOKEN,
    chatId: CHAT_ID,
    groqKey: GROQ_KEY,
    pexelsKey: PEXELS_KEY,
    sendMessage,
    sendPhoto,
    sendPoll,
    sendQuiz,
    generateText: (prompt) => generateText(GROQ_KEY, prompt),
  };
}

async function fetchAndSendPhoto() {
  const photoHistory = loadHistory();
  let photo = null;
  for (let i = 0; i < 10; i++) {
    const candidate = await fetchRandomAnimal(PEXELS_KEY);
    if (!isAlreadySent(photoHistory, candidate.id)) {
      photo = candidate;
      break;
    }
  }
  if (photo) {
    await sendPhoto(BOT_TOKEN, CHAT_ID, photo.url, '');
    recordSent(photoHistory, photo);
    console.log(`[${new Date().toISOString()}] BubbleFubble: [photo: ${photo.source}/${photo.id} (${photo.animal})]`);
    // Run afterPhoto hooks with animal context
    const ctx = makeCtx();
    ctx.animal = photo.animal;
    await fm.runHook('afterPhoto', ctx);
    return true;
  }
  return false;
}

async function handleToolCall(toolName, args, chatHistory, userText) {
  if (toolName === 'send_photo') {
    const sent = await fetchAndSendPhoto();
    if (!sent) {
      await sendMessage(BOT_TOKEN, CHAT_ID, 'Hmm, ich konnte gerade kein neues Foto finden... versuch es gleich nochmal! 🙈');
    }
    addMessage(chatHistory, 'user', userText);
    addMessage(chatHistory, 'model', '(sent a cute animal photo)');
    return;
  }

  if (toolName === 'list_features') {
    const list = fm.getFeatureList();
    const lines = list.map(
      (f) => `${f.enabled ? '✅' : '❌'} ${f.name} — ${f.description}`
    );
    const msg = '🔧 Features:\n\n' + lines.join('\n');
    await sendMessage(BOT_TOKEN, CHAT_ID, msg);
    addMessage(chatHistory, 'user', userText);
    addMessage(chatHistory, 'model', msg);
    return;
  }

  if (toolName === 'toggle_feature') {
    const newState = fm.toggle(args.feature_id);
    if (newState === null) {
      await sendMessage(BOT_TOKEN, CHAT_ID, `Feature "${args.feature_id}" not found.`);
    } else {
      const feature = fm.getFeatureList().find((f) => f.id === args.feature_id);
      const name = feature?.name || args.feature_id;
      const msg = newState
        ? `✅ ${name} is now enabled!`
        : `❌ ${name} is now disabled.`;
      await sendMessage(BOT_TOKEN, CHAT_ID, msg);
      addMessage(chatHistory, 'user', userText);
      addMessage(chatHistory, 'model', msg);
    }
    return;
  }

  // Check feature-specific tools
  const feature = fm.findFeatureForTool(toolName);
  if (feature && typeof feature.handleTool === 'function') {
    const ctx = makeCtx();
    ctx.loadFeatureData = () => fm.getFeatureData(feature.id);
    ctx.saveFeatureData = (data) => fm.setFeatureData(feature.id, data);
    const result = await feature.handleTool(toolName, args, ctx);
    if (result) {
      // Let the AI respond naturally after the tool call
      const reply = await generateText(
        GROQ_KEY,
        `You just performed an action: ${result}. ` +
        `The user said: "${userText}". Write a short, friendly confirmation ` +
        `in the same language the user used. 1-2 sentences max. Use emoji.`
      );
      if (reply) {
        await sendMessage(BOT_TOKEN, CHAT_ID, reply);
        addMessage(chatHistory, 'user', userText);
        addMessage(chatHistory, 'model', reply);
      }
    }
    return;
  }

  console.warn(`Unknown tool call: ${toolName}`);
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

      const msg = update.message;
      if (!msg || !msg.text) continue;

      if (String(msg.chat.id) !== String(CHAT_ID)) {
        console.log(`Ignoring message from chat ${msg.chat.id}`);
        continue;
      }

      const userText = msg.text;
      const userName = msg.from?.first_name || 'User';
      console.log(`[${new Date().toISOString()}] ${userName}: ${userText}`);

      try {
        const chatHistory = loadChatHistory();

        // Build dynamic prompt and tools from enabled features
        const systemPrompt = fm.buildSystemPrompt(BASE_PROMPT);
        const tools = fm.buildTools(BASE_TOOLS);

        const result = await generateReply(GROQ_KEY, chatHistory, userText, systemPrompt, tools);
        console.log(
          `[${new Date().toISOString()}] AI decision: ${result.type}` +
          (result.toolName ? ` (${result.toolName})` : '') +
          (result.text ? ` -> ${result.text.substring(0, 80)}` : '')
        );

        if (result.type === 'tool_call') {
          await handleToolCall(result.toolName, result.args, chatHistory, userText);
        } else {
          await sendMessage(BOT_TOKEN, CHAT_ID, result.text);
          console.log(`[${new Date().toISOString()}] BubbleFubble: ${result.text}`);
          addMessage(chatHistory, 'user', userText);
          addMessage(chatHistory, 'model', result.text);
        }
      } catch (err) {
        console.error('Reply error:', err.message);
      }
    }
  }

  console.log('Bot stopped.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

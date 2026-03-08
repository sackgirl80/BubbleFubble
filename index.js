const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { fetchRandomAnimal } = require('./lib/sources');
const { loadHistory, isAlreadySent, recordSent } = require('./lib/history');
const { sendPhoto, sendMessage, sendPoll, sendQuiz } = require('./lib/telegram');
const { generateText, getApiKey, getProvider } = require('./lib/ai');
const { getAllChatIds, getUser } = require('./lib/users');
const fm = require('./lib/feature-manager');

const CAPTIONS = [
  'Guten Morgen! Hier ist deine tägliche Dosis Niedlichkeit',
  'Dein täglicher Tierfreund ist da!',
  'Schau mal, wer heute vorbeischaut!',
  'Jemand wollte dir heute Hallo sagen',
  'Niedlichkeits-Lieferung!',
  'Dein tägliches Lächeln, frisch serviert',
  'Dieses kleine Wesen wollte deinen Tag verschönern',
  'Speziallieferung: ein bezauberndes Tierchen',
  'Rate mal, wer heute zu Besuch kommt!',
  'Dieses Tier hat heute an dich gedacht',
];

function resolveAiKey(chatId) {
  const user = getUser(chatId);
  if (user?.aiKey) return user.aiKey;
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

async function main() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const pexelsKey = process.env.PEXELS_API_KEY;

  if (!botToken || botToken === 'your_bot_token_here') {
    console.error('Set TELEGRAM_BOT_TOKEN in .env');
    process.exit(1);
  }
  if (!pexelsKey || pexelsKey === 'your_pexels_api_key_here') {
    console.error('Set PEXELS_API_KEY in .env (free at https://www.pexels.com/api/)');
    process.exit(1);
  }

  // Load features
  fm.loadFeatures();

  const chatIds = getAllChatIds();
  if (chatIds.length === 0) {
    console.log('No registered users. Send /start to the bot first.');
    process.exit(0);
  }

  console.log(`[${new Date().toISOString()}] BubbleFubble starting for ${chatIds.length} user(s)...`);

  for (const chatId of chatIds) {
    fm.loadConfig(chatId);
    const aiKey = resolveAiKey(chatId);
    const provider = resolveProvider(chatId);

    const history = loadHistory(chatId);
    console.log(`[${chatId}] History: ${history.sent.length} photos previously sent.`);

    let photo = null;
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidate = await fetchRandomAnimal(pexelsKey);
      if (!isAlreadySent(history, candidate.id)) {
        photo = candidate;
        break;
      }
      console.log(
        `[${chatId}] Duplicate (${candidate.id}), retrying... (${attempt + 1}/${maxAttempts})`
      );
    }

    if (!photo) {
      console.error(`[${chatId}] Could not find a new photo after ${maxAttempts} attempts.`);
      continue;
    }

    console.log(`[${chatId}] Selected: ${photo.source} / ${photo.id}`);

    // Build context for feature hooks
    const ctx = {
      botToken,
      chatId,
      aiKey,
      aiProvider: provider,
      pexelsKey,
      sendMessage,
      sendPhoto,
      sendPoll,
      sendQuiz,
      generateText: (prompt) => generateText(aiKey, prompt, provider),
      animal: photo.animal,
      photoUrl: photo.url,
      photoId: photo.id,
      photoSource: photo.source,
    };

    // Run beforePhoto hooks (e.g. guess the animal poll)
    await fm.runHook('beforePhoto', ctx);

    // Check if guess feature delayed the photo (waiting for user to answer poll)
    const guessData = fm.getFeatureData(chatId, 'guess_the_animal');
    if (guessData.pendingGuess) {
      console.log(`[${chatId}] Photo delayed — waiting for guess poll answer`);
    } else {
      const caption = CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)];
      await sendPhoto(botToken, chatId, photo.url, caption);
      console.log(`[${chatId}] Photo sent!`);
      recordSent(chatId, history, photo);
      await fm.runHook('afterPhoto', ctx);
    }

    await fm.runHook('onDaily', ctx);
  }

  console.log(`[${new Date().toISOString()}] Done.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

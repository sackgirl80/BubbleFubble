const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { fetchRandomAnimal } = require('./lib/sources');
const { loadHistory, isAlreadySent, recordSent } = require('./lib/history');
const { sendPhoto } = require('./lib/telegram');

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

async function main() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const pexelsKey = process.env.PEXELS_API_KEY;

  if (!botToken || botToken === 'your_bot_token_here') {
    console.error('Set TELEGRAM_BOT_TOKEN in .env');
    process.exit(1);
  }
  if (!chatId || chatId === 'your_chat_id_here') {
    console.error('Set TELEGRAM_CHAT_ID in .env (run: node get-chat-id.js)');
    process.exit(1);
  }
  if (!pexelsKey || pexelsKey === 'your_pexels_api_key_here') {
    console.error('Set PEXELS_API_KEY in .env (free at https://www.pexels.com/api/)');
    process.exit(1);
  }

  console.log(`[${new Date().toISOString()}] BubbleFubble starting...`);

  const history = loadHistory();
  console.log(`History: ${history.sent.length} photos previously sent.`);

  let photo = null;
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = await fetchRandomAnimal(pexelsKey);
    if (!isAlreadySent(history, candidate.id)) {
      photo = candidate;
      break;
    }
    console.log(
      `Duplicate (${candidate.id}), retrying... (${attempt + 1}/${maxAttempts})`
    );
  }

  if (!photo) {
    console.error(`Could not find a new photo after ${maxAttempts} attempts.`);
    process.exit(1);
  }

  console.log(`Selected: ${photo.source} / ${photo.id}`);

  const caption = CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)];

  await sendPhoto(botToken, chatId, photo.url, caption);
  console.log('Photo sent!');

  recordSent(history, photo);
  console.log(`[${new Date().toISOString()}] Done.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

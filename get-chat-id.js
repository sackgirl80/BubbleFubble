const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { getUpdates } = require('./lib/telegram');

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || token === 'your_bot_token_here') {
    console.error('Set TELEGRAM_BOT_TOKEN in .env first.');
    process.exit(1);
  }

  console.log('Fetching messages sent to your bot...\n');

  const updates = await getUpdates(token);

  if (!updates.length) {
    console.log('No messages found. Make sure your daughter has sent /start to the bot.');
    process.exit(0);
  }

  const seen = new Set();
  for (const update of updates) {
    const chat = update.message?.chat;
    if (!chat || seen.has(chat.id)) continue;
    seen.add(chat.id);
    const name = [chat.first_name, chat.last_name].filter(Boolean).join(' ');
    console.log(`  Name: ${name || '(unknown)'}`);
    console.log(`  Chat ID: ${chat.id}`);
    console.log(`  Username: ${chat.username || '(none)'}`);
    console.log('');
  }

  console.log('Copy the Chat ID above and set TELEGRAM_CHAT_ID in .env');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { sendMessage, getUpdatesLongPoll } = require('./lib/telegram');
const { loadChatHistory, addMessage } = require('./lib/chat-history');
const { generateReply } = require('./lib/ai');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const GROQ_KEY = process.env.GROQ_API_KEY;

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

let running = true;

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  running = false;
});
process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  running = false;
});

async function main() {
  console.log(`[${new Date().toISOString()}] BubbleFubble bot listening...`);

  let offset;

  while (running) {
    let updates;
    try {
      updates = await getUpdatesLongPoll(BOT_TOKEN, offset, 30);
    } catch (err) {
      // Timeouts are normal — just means no messages arrived during the poll window
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

      // Only respond to the configured chat
      if (String(msg.chat.id) !== String(CHAT_ID)) {
        console.log(`Ignoring message from chat ${msg.chat.id}`);
        continue;
      }

      const userText = msg.text;
      const userName = msg.from?.first_name || 'User';
      console.log(`[${new Date().toISOString()}] ${userName}: ${userText}`);

      try {
        const history = loadChatHistory();
        const reply = await generateReply(GROQ_KEY, history, userText);

        await sendMessage(BOT_TOKEN, CHAT_ID, reply);
        console.log(`[${new Date().toISOString()}] BubbleFubble: ${reply}`);

        // Save both sides of the conversation
        addMessage(history, 'user', userText);
        addMessage(history, 'model', reply);
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

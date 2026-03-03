const fs = require('fs');
const path = require('path');

const HISTORY_PATH = path.join(__dirname, '..', 'chat-history.json');
const MAX_MESSAGES = 20;

function loadChatHistory() {
  try {
    const data = fs.readFileSync(HISTORY_PATH, 'utf8');
    return JSON.parse(data);
  } catch {
    return { messages: [] };
  }
}

function saveChatHistory(history) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

function addMessage(history, role, text) {
  history.messages.push({
    role,
    text,
    timestamp: new Date().toISOString(),
  });

  // Trim to last N messages
  if (history.messages.length > MAX_MESSAGES) {
    history.messages = history.messages.slice(-MAX_MESSAGES);
  }

  saveChatHistory(history);
}

module.exports = { loadChatHistory, addMessage };

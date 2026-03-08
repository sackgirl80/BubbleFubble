const fs = require('fs');
const path = require('path');
const { userDataDir } = require('./users');

const MAX_MESSAGES = 100;

function historyPath(chatId) {
  return path.join(userDataDir(chatId), 'chat-history.json');
}

function loadChatHistory(chatId) {
  try {
    const data = fs.readFileSync(historyPath(chatId), 'utf8');
    return JSON.parse(data);
  } catch {
    return { messages: [] };
  }
}

function saveChatHistory(chatId, history) {
  fs.writeFileSync(historyPath(chatId), JSON.stringify(history, null, 2));
}

function addMessage(chatId, history, role, text) {
  history.messages.push({
    role,
    text,
    timestamp: new Date().toISOString(),
  });

  if (history.messages.length > MAX_MESSAGES) {
    history.messages = history.messages.slice(-MAX_MESSAGES);
  }

  saveChatHistory(chatId, history);
}

module.exports = { loadChatHistory, addMessage };

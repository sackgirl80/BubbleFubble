const fs = require('fs');
const path = require('path');
const { userDataDir } = require('./users');

function historyPath(chatId) {
  return path.join(userDataDir(chatId), 'sent-photos.json');
}

function loadHistory(chatId) {
  try {
    const data = fs.readFileSync(historyPath(chatId), 'utf8');
    return JSON.parse(data);
  } catch {
    return { sent: [] };
  }
}

function saveHistory(chatId, history) {
  fs.writeFileSync(historyPath(chatId), JSON.stringify(history, null, 2));
}

function isAlreadySent(history, id) {
  return history.sent.some((entry) => entry.id === id);
}

function recordSent(chatId, history, entry) {
  history.sent.push({
    id: entry.id,
    url: entry.url,
    source: entry.source,
    sentAt: new Date().toISOString(),
  });
  saveHistory(chatId, history);
}

module.exports = { loadHistory, saveHistory, isAlreadySent, recordSent };

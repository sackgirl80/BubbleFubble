const fs = require('fs');
const path = require('path');

const HISTORY_PATH = path.join(__dirname, '..', 'sent-photos.json');

function loadHistory() {
  try {
    const data = fs.readFileSync(HISTORY_PATH, 'utf8');
    return JSON.parse(data);
  } catch {
    return { sent: [] };
  }
}

function saveHistory(history) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

function isAlreadySent(history, id) {
  return history.sent.some((entry) => entry.id === id);
}

function recordSent(history, entry) {
  history.sent.push({
    id: entry.id,
    url: entry.url,
    source: entry.source,
    sentAt: new Date().toISOString(),
  });
  saveHistory(history);
}

module.exports = { loadHistory, saveHistory, isAlreadySent, recordSent };

const { getDb } = require('./db');

function loadHistory(chatId) {
  chatId = String(chatId);
  const db = getDb();
  const rows = db.prepare(
    'SELECT photo_id as id, url, source, animal, sent_at as sentAt FROM sent_photos WHERE chat_id = ? ORDER BY id'
  ).all(chatId);
  return { sent: rows };
}

function isAlreadySent(history, id) {
  return history.sent.some((entry) => entry.id === id);
}

function recordSent(chatId, history, entry) {
  chatId = String(chatId);
  const sentAt = new Date().toISOString();
  const db = getDb();
  db.prepare(
    'INSERT INTO sent_photos (chat_id, photo_id, url, source, animal, sent_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(chatId, entry.id, entry.url, entry.source, entry.animal || null, sentAt);

  history.sent.push({
    id: entry.id,
    url: entry.url,
    source: entry.source,
    animal: entry.animal,
    sentAt,
  });
}

module.exports = { loadHistory, isAlreadySent, recordSent };

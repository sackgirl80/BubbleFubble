const { getDb } = require('./db');

const MAX_MESSAGES = 100;

function loadChatHistory(chatId) {
  chatId = String(chatId);
  const db = getDb();
  const rows = db.prepare(
    'SELECT role, text, timestamp FROM chat_history WHERE chat_id = ? ORDER BY id DESC LIMIT ?'
  ).all(chatId, MAX_MESSAGES);
  return { messages: rows.reverse() };
}

function addMessage(chatId, history, role, text) {
  chatId = String(chatId);
  const timestamp = new Date().toISOString();
  const db = getDb();
  db.prepare(
    'INSERT INTO chat_history (chat_id, role, text, timestamp) VALUES (?, ?, ?, ?)'
  ).run(chatId, role, text, timestamp);

  history.messages.push({ role, text, timestamp });

  // Trim in-memory
  if (history.messages.length > MAX_MESSAGES) {
    history.messages = history.messages.slice(-MAX_MESSAGES);
  }

  // Trim DB — keep last MAX_MESSAGES per user
  db.prepare(`
    DELETE FROM chat_history WHERE chat_id = ? AND id NOT IN (
      SELECT id FROM chat_history WHERE chat_id = ? ORDER BY id DESC LIMIT ?
    )
  `).run(chatId, chatId, MAX_MESSAGES);
}

module.exports = { loadChatHistory, addMessage };

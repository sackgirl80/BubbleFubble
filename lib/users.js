const { getDb } = require('./db');

function registerUser(chatId, firstName) {
  chatId = String(chatId);
  const db = getDb();
  const existing = db.prepare('SELECT chat_id FROM users WHERE chat_id = ?').get(chatId);
  if (existing) return false;
  db.prepare('INSERT INTO users (chat_id, first_name) VALUES (?, ?)').run(chatId, firstName || 'User');
  return true;
}

function isRegistered(chatId) {
  const db = getDb();
  const row = db.prepare('SELECT chat_id FROM users WHERE chat_id = ?').get(String(chatId));
  return !!row;
}

function getAllChatIds() {
  const db = getDb();
  const rows = db.prepare('SELECT chat_id FROM users').all();
  return rows.map((r) => r.chat_id);
}

function getUser(chatId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE chat_id = ?').get(String(chatId));
  if (!row) return null;
  return {
    registeredAt: row.registered_at,
    firstName: row.first_name,
    aiProvider: row.ai_provider,
    aiKey: row.ai_key,
  };
}

function updateUser(chatId, updates) {
  chatId = String(chatId);
  const db = getDb();
  const existing = db.prepare('SELECT chat_id FROM users WHERE chat_id = ?').get(chatId);
  if (!existing) return false;
  const fields = [];
  const values = [];
  if ('firstName' in updates) { fields.push('first_name = ?'); values.push(updates.firstName); }
  if ('aiProvider' in updates) { fields.push('ai_provider = ?'); values.push(updates.aiProvider); }
  if ('aiKey' in updates) { fields.push('ai_key = ?'); values.push(updates.aiKey); }
  if (fields.length === 0) return true;
  values.push(chatId);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE chat_id = ?`).run(...values);
  return true;
}

module.exports = {
  registerUser,
  isRegistered,
  getAllChatIds,
  getUser,
  updateUser,
};

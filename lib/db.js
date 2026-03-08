const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'bubblefubble.db');

let db = null;

function getDb() {
  if (db) return db;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      chat_id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL DEFAULT 'User',
      ai_provider TEXT,
      ai_key TEXT,
      registered_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL,
      role TEXT NOT NULL,
      text TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (chat_id) REFERENCES users(chat_id)
    );

    CREATE INDEX IF NOT EXISTS idx_chat_history_chat_id
      ON chat_history(chat_id);

    CREATE TABLE IF NOT EXISTS sent_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL,
      photo_id TEXT NOT NULL,
      url TEXT,
      source TEXT,
      animal TEXT,
      sent_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (chat_id) REFERENCES users(chat_id)
    );

    CREATE INDEX IF NOT EXISTS idx_sent_photos_chat_id
      ON sent_photos(chat_id);

    CREATE TABLE IF NOT EXISTS feature_config (
      chat_id TEXT NOT NULL,
      feature_id TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (chat_id, feature_id),
      FOREIGN KEY (chat_id) REFERENCES users(chat_id)
    );

    CREATE TABLE IF NOT EXISTS feature_data (
      chat_id TEXT NOT NULL,
      feature_id TEXT NOT NULL,
      data TEXT NOT NULL DEFAULT '{}',
      PRIMARY KEY (chat_id, feature_id),
      FOREIGN KEY (chat_id) REFERENCES users(chat_id)
    );
  `);

  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb, DATA_DIR, DB_PATH };

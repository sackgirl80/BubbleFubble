#!/usr/bin/env node

/**
 * Migrates data from JSON files (per-user directories) to SQLite.
 * Safe to run multiple times (idempotent).
 *
 * Usage: node migrate-to-sqlite.js
 */

const fs = require('fs');
const path = require('path');
const { getDb, closeDb } = require('./lib/db');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_PATH = path.join(DATA_DIR, 'users.json');

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

const db = getDb();
console.log('SQLite database ready.');

// Migrate users
const usersData = readJson(USERS_PATH);
if (usersData && usersData.users) {
  const insertUser = db.prepare(
    'INSERT OR IGNORE INTO users (chat_id, first_name, ai_provider, ai_key, registered_at) VALUES (?, ?, ?, ?, ?)'
  );
  let count = 0;
  for (const [chatId, user] of Object.entries(usersData.users)) {
    insertUser.run(chatId, user.firstName || 'User', user.aiProvider || null, user.aiKey || null, user.registeredAt || new Date().toISOString());
    count++;
  }
  console.log(`Users: migrated ${count} user(s)`);
} else {
  console.log('Users: no users.json found (skipping)');
}

// Migrate per-user data
const userDirs = fs.existsSync(DATA_DIR)
  ? fs.readdirSync(DATA_DIR).filter((d) => {
      const full = path.join(DATA_DIR, d);
      return fs.statSync(full).isDirectory();
    })
  : [];

const insertHistory = db.prepare(
  'INSERT INTO chat_history (chat_id, role, text, timestamp) VALUES (?, ?, ?, ?)'
);
const insertPhoto = db.prepare(
  'INSERT INTO sent_photos (chat_id, photo_id, url, source, animal, sent_at) VALUES (?, ?, ?, ?, ?, ?)'
);
const insertConfig = db.prepare(
  'INSERT OR IGNORE INTO feature_config (chat_id, feature_id, enabled) VALUES (?, ?, ?)'
);
const insertData = db.prepare(
  'INSERT OR REPLACE INTO feature_data (chat_id, feature_id, data) VALUES (?, ?, ?)'
);

for (const chatId of userDirs) {
  const dir = path.join(DATA_DIR, chatId);
  console.log(`\n[${chatId}]`);

  // Check if already migrated (has chat_history rows)
  const existingRows = db.prepare('SELECT COUNT(*) as n FROM chat_history WHERE chat_id = ?').get(chatId);

  // Chat history
  const chatHistoryData = readJson(path.join(dir, 'chat-history.json'));
  if (chatHistoryData && chatHistoryData.messages && chatHistoryData.messages.length > 0) {
    if (existingRows.n > 0) {
      console.log(`  chat-history: already migrated (${existingRows.n} rows), skipping`);
    } else {
      const migrateHistory = db.transaction(() => {
        for (const msg of chatHistoryData.messages) {
          insertHistory.run(chatId, msg.role, msg.text, msg.timestamp || new Date().toISOString());
        }
      });
      migrateHistory();
      console.log(`  chat-history: migrated ${chatHistoryData.messages.length} messages`);
    }
  } else {
    console.log('  chat-history: empty or missing');
  }

  // Sent photos
  const existingPhotos = db.prepare('SELECT COUNT(*) as n FROM sent_photos WHERE chat_id = ?').get(chatId);
  const photosData = readJson(path.join(dir, 'sent-photos.json'));
  if (photosData && photosData.sent && photosData.sent.length > 0) {
    if (existingPhotos.n > 0) {
      console.log(`  sent-photos: already migrated (${existingPhotos.n} rows), skipping`);
    } else {
      const migratePhotos = db.transaction(() => {
        for (const p of photosData.sent) {
          insertPhoto.run(chatId, p.id, p.url || null, p.source || null, p.animal || null, p.sentAt || new Date().toISOString());
        }
      });
      migratePhotos();
      console.log(`  sent-photos: migrated ${photosData.sent.length} photos`);
    }
  } else {
    console.log('  sent-photos: empty or missing');
  }

  // Features config + data
  const featuresData = readJson(path.join(dir, 'features.json'));
  if (featuresData) {
    if (featuresData.enabled) {
      for (const [fId, enabled] of Object.entries(featuresData.enabled)) {
        insertConfig.run(chatId, fId, enabled ? 1 : 0);
      }
      console.log(`  features config: migrated ${Object.keys(featuresData.enabled).length} toggles`);
    }
    if (featuresData.data) {
      for (const [fId, data] of Object.entries(featuresData.data)) {
        insertData.run(chatId, fId, JSON.stringify(data));
      }
      console.log(`  features data: migrated ${Object.keys(featuresData.data).length} feature data entries`);
    }
  } else {
    console.log('  features: empty or missing');
  }
}

closeDb();
console.log('\nMigration complete!');
console.log('The JSON files are still intact — you can delete them after verifying.');

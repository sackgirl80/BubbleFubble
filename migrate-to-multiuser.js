#!/usr/bin/env node

/**
 * One-time migration: moves single-user data files into per-user data directory.
 * Safe to run multiple times (idempotent).
 *
 * Usage: node migrate-to-multiuser.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { registerUser, userDataDir, DATA_DIR } = require('./lib/users');

const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!CHAT_ID || CHAT_ID === 'your_chat_id_here') {
  console.error('Set TELEGRAM_CHAT_ID in .env to migrate the existing user.');
  process.exit(1);
}

const FILES_TO_MIGRATE = [
  'chat-history.json',
  'sent-photos.json',
  'features.json',
];

console.log(`Migrating data for chat ID: ${CHAT_ID}`);

// Register the existing user
const isNew = registerUser(CHAT_ID, 'Existing User');
if (isNew) {
  console.log('User registered in users.json');
} else {
  console.log('User already registered');
}

const destDir = userDataDir(CHAT_ID);

for (const file of FILES_TO_MIGRATE) {
  const src = path.join(__dirname, file);
  const dest = path.join(destDir, file);

  if (!fs.existsSync(src)) {
    console.log(`  ${file}: not found (skipping)`);
    continue;
  }

  if (fs.existsSync(dest)) {
    console.log(`  ${file}: already exists in data/${CHAT_ID}/ (skipping)`);
    continue;
  }

  fs.copyFileSync(src, dest);
  fs.renameSync(src, src + '.bak');
  console.log(`  ${file}: migrated (original renamed to ${file}.bak)`);
}

console.log('Migration complete!');
console.log(`Data directory: ${destDir}`);
console.log('\nYou can now remove TELEGRAM_CHAT_ID from .env if you want.');
console.log('Users register by sending /start to the bot.');

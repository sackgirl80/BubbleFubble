const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_PATH = path.join(DATA_DIR, 'users.json');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadUsers() {
  ensureDir(DATA_DIR);
  try {
    const data = fs.readFileSync(USERS_PATH, 'utf8');
    return JSON.parse(data);
  } catch {
    return { users: {} };
  }
}

function saveUsers(registry) {
  ensureDir(DATA_DIR);
  fs.writeFileSync(USERS_PATH, JSON.stringify(registry, null, 2));
}

function registerUser(chatId, firstName) {
  chatId = String(chatId);
  const registry = loadUsers();
  if (registry.users[chatId]) return false;
  ensureDir(userDataDir(chatId));
  registry.users[chatId] = {
    registeredAt: new Date().toISOString(),
    firstName: firstName || 'User',
    aiProvider: null,
    aiKey: null,
  };
  saveUsers(registry);
  return true;
}

function isRegistered(chatId) {
  const registry = loadUsers();
  return !!registry.users[String(chatId)];
}

function getAllChatIds() {
  const registry = loadUsers();
  return Object.keys(registry.users);
}

function getUser(chatId) {
  const registry = loadUsers();
  return registry.users[String(chatId)] || null;
}

function updateUser(chatId, updates) {
  chatId = String(chatId);
  const registry = loadUsers();
  if (!registry.users[chatId]) return false;
  Object.assign(registry.users[chatId], updates);
  saveUsers(registry);
  return true;
}

function userDataDir(chatId) {
  return path.join(DATA_DIR, String(chatId));
}

module.exports = {
  loadUsers,
  saveUsers,
  registerUser,
  isRegistered,
  getAllChatIds,
  getUser,
  updateUser,
  userDataDir,
  DATA_DIR,
};

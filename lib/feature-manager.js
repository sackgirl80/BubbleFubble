const fs = require('fs');
const path = require('path');
const { getDb } = require('./db');

const FEATURES_DIR = path.join(__dirname, '..', 'features');

let features = [];

function loadFeatures() {
  features = [];
  const files = fs.readdirSync(FEATURES_DIR).filter((f) => f.endsWith('.js'));
  for (const file of files) {
    try {
      const modPath = path.join(FEATURES_DIR, file);
      delete require.cache[require.resolve(modPath)];
      const mod = require(modPath);
      if (mod.id && mod.name) {
        features.push(mod);
      }
    } catch (err) {
      console.error(`Failed to load feature ${file}:`, err.message);
    }
  }
  return features;
}

function loadConfig(chatId) {
  chatId = String(chatId);
  const db = getDb();
  // Ensure defaults for any features not yet in DB
  const existing = new Set(
    db.prepare('SELECT feature_id FROM feature_config WHERE chat_id = ?').all(chatId)
      .map((r) => r.feature_id)
  );
  const insert = db.prepare(
    'INSERT OR IGNORE INTO feature_config (chat_id, feature_id, enabled) VALUES (?, ?, ?)'
  );
  for (const f of features) {
    if (!existing.has(f.id)) {
      insert.run(chatId, f.id, f.defaultEnabled !== false ? 1 : 0);
    }
  }
}

function isEnabled(chatId, featureId) {
  const db = getDb();
  const row = db.prepare(
    'SELECT enabled FROM feature_config WHERE chat_id = ? AND feature_id = ?'
  ).get(String(chatId), featureId);
  return row ? row.enabled === 1 : true;
}

function toggle(chatId, featureId) {
  chatId = String(chatId);
  const feature = features.find((f) => f.id === featureId);
  if (!feature) return null;
  const current = isEnabled(chatId, featureId);
  const newState = !current;
  const db = getDb();
  db.prepare(
    'INSERT OR REPLACE INTO feature_config (chat_id, feature_id, enabled) VALUES (?, ?, ?)'
  ).run(chatId, featureId, newState ? 1 : 0);
  return newState;
}

function getFeatureData(chatId, featureId) {
  const db = getDb();
  const row = db.prepare(
    'SELECT data FROM feature_data WHERE chat_id = ? AND feature_id = ?'
  ).get(String(chatId), featureId);
  if (!row) return {};
  try { return JSON.parse(row.data); } catch { return {}; }
}

function setFeatureData(chatId, featureId, data) {
  chatId = String(chatId);
  const db = getDb();
  db.prepare(
    'INSERT OR REPLACE INTO feature_data (chat_id, feature_id, data) VALUES (?, ?, ?)'
  ).run(chatId, featureId, JSON.stringify(data));
}

function buildSystemPrompt(chatId, basePrompt) {
  const additions = [];
  for (const f of features) {
    if (!isEnabled(chatId, f.id)) continue;
    let prompt = typeof f.promptAddition === 'function'
      ? f.promptAddition(getFeatureData(chatId, f.id))
      : f.promptAddition;
    if (prompt) additions.push(prompt);
  }
  if (additions.length === 0) return basePrompt;
  return basePrompt + '\n\nENABLED FEATURES:\n' + additions.join('\n');
}

function buildTools(chatId, baseTools) {
  const allTools = [...baseTools];
  for (const f of features) {
    if (!isEnabled(chatId, f.id) || !f.tools) continue;
    const tools = typeof f.tools === 'function'
      ? f.tools(getFeatureData(chatId, f.id))
      : f.tools;
    allTools.push(...tools);
  }
  return allTools;
}

function getFeatureList(chatId) {
  return features.map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
    enabled: isEnabled(chatId, f.id),
  }));
}

async function runHook(hookName, ctx) {
  const chatId = String(ctx.chatId);
  for (const f of features) {
    if (!isEnabled(chatId, f.id) || typeof f[hookName] !== 'function') continue;
    try {
      await f[hookName]({
        ...ctx,
        loadFeatureData: () => getFeatureData(chatId, f.id),
        saveFeatureData: (data) => setFeatureData(chatId, f.id, data),
        getFeatureData: (fId) => getFeatureData(chatId, fId),
        loadPhotoHistory: () => {
          const { loadHistory } = require('./history');
          return loadHistory(chatId);
        },
        getProvider: () => {
          if (ctx.aiProvider) return ctx.aiProvider;
          const { getProvider } = require('./ai');
          return getProvider();
        },
      });
    } catch (err) {
      console.error(`Feature ${f.id} hook ${hookName} failed:`, err.message);
    }
  }
}

function findFeatureForTool(chatId, toolName) {
  for (const f of features) {
    if (!isEnabled(chatId, f.id) || !f.tools) continue;
    const tools = typeof f.tools === 'function'
      ? f.tools(getFeatureData(chatId, f.id))
      : f.tools;
    if (tools.some((t) => t.function.name === toolName)) {
      return f;
    }
  }
  return null;
}

module.exports = {
  loadFeatures,
  loadConfig,
  isEnabled,
  toggle,
  getFeatureData,
  setFeatureData,
  buildSystemPrompt,
  buildTools,
  getFeatureList,
  runHook,
  findFeatureForTool,
};

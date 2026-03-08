const fs = require('fs');
const path = require('path');
const { userDataDir } = require('./users');

const FEATURES_DIR = path.join(__dirname, '..', 'features');

let features = [];
const userConfigs = new Map();

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

function configPath(chatId) {
  return path.join(userDataDir(chatId), 'features.json');
}

function loadConfig(chatId) {
  chatId = String(chatId);
  let config;
  try {
    const data = fs.readFileSync(configPath(chatId), 'utf8');
    config = JSON.parse(data);
  } catch {
    config = { enabled: {}, data: {} };
  }
  for (const f of features) {
    if (config.enabled[f.id] === undefined) {
      config.enabled[f.id] = f.defaultEnabled !== false;
    }
  }
  userConfigs.set(chatId, config);
  saveConfig(chatId);
  return config;
}

function saveConfig(chatId) {
  chatId = String(chatId);
  const config = userConfigs.get(chatId);
  if (!config) return;
  fs.writeFileSync(configPath(chatId), JSON.stringify(config, null, 2));
}

function getConfig(chatId) {
  chatId = String(chatId);
  return userConfigs.get(chatId) || loadConfig(chatId);
}

function isEnabled(chatId, featureId) {
  return getConfig(chatId).enabled[featureId] !== false;
}

function toggle(chatId, featureId) {
  chatId = String(chatId);
  const feature = features.find((f) => f.id === featureId);
  if (!feature) return null;
  const config = getConfig(chatId);
  config.enabled[featureId] = !isEnabled(chatId, featureId);
  saveConfig(chatId);
  return config.enabled[featureId];
}

function getFeatureData(chatId, featureId) {
  return getConfig(chatId).data[featureId] || {};
}

function setFeatureData(chatId, featureId, data) {
  chatId = String(chatId);
  const config = getConfig(chatId);
  config.data[featureId] = data;
  saveConfig(chatId);
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
        // Cross-feature helpers for features that need other features' data
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
  saveConfig,
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

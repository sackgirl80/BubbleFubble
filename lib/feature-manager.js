const fs = require('fs');
const path = require('path');

const FEATURES_DIR = path.join(__dirname, '..', 'features');
const CONFIG_PATH = path.join(__dirname, '..', 'features.json');

let features = [];
let config = { enabled: {}, data: {} };

function loadFeatures() {
  features = [];
  const files = fs.readdirSync(FEATURES_DIR).filter((f) => f.endsWith('.js'));
  for (const file of files) {
    try {
      // Clear require cache so features can be reloaded
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

function loadConfig() {
  try {
    const data = fs.readFileSync(CONFIG_PATH, 'utf8');
    config = JSON.parse(data);
  } catch {
    config = { enabled: {}, data: {} };
  }
  // Ensure defaults for any new features
  for (const f of features) {
    if (config.enabled[f.id] === undefined) {
      config.enabled[f.id] = f.defaultEnabled !== false;
    }
  }
  saveConfig();
  return config;
}

function saveConfig() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function isEnabled(featureId) {
  return config.enabled[featureId] !== false;
}

function toggle(featureId) {
  const feature = features.find((f) => f.id === featureId);
  if (!feature) return null;
  config.enabled[featureId] = !isEnabled(featureId);
  saveConfig();
  return config.enabled[featureId];
}

function getFeatureData(featureId) {
  return config.data[featureId] || {};
}

function setFeatureData(featureId, data) {
  config.data[featureId] = data;
  saveConfig();
}

function buildSystemPrompt(basePrompt) {
  const additions = [];
  for (const f of features) {
    if (!isEnabled(f.id)) continue;
    let prompt = typeof f.promptAddition === 'function'
      ? f.promptAddition(getFeatureData(f.id))
      : f.promptAddition;
    if (prompt) additions.push(prompt);
  }
  if (additions.length === 0) return basePrompt;
  return basePrompt + '\n\nENABLED FEATURES:\n' + additions.join('\n');
}

function buildTools(baseTools) {
  const allTools = [...baseTools];
  for (const f of features) {
    if (!isEnabled(f.id) || !f.tools) continue;
    const tools = typeof f.tools === 'function'
      ? f.tools(getFeatureData(f.id))
      : f.tools;
    allTools.push(...tools);
  }
  return allTools;
}

function getFeatureList() {
  return features.map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
    enabled: isEnabled(f.id),
  }));
}

async function runHook(hookName, ctx) {
  for (const f of features) {
    if (!isEnabled(f.id) || typeof f[hookName] !== 'function') continue;
    try {
      await f[hookName]({
        ...ctx,
        loadFeatureData: () => getFeatureData(f.id),
        saveFeatureData: (data) => setFeatureData(f.id, data),
      });
    } catch (err) {
      console.error(`Feature ${f.id} hook ${hookName} failed:`, err.message);
    }
  }
}

function findFeatureForTool(toolName) {
  for (const f of features) {
    if (!isEnabled(f.id) || !f.tools) continue;
    const tools = typeof f.tools === 'function'
      ? f.tools(getFeatureData(f.id))
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

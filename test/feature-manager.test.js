const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const TEST_CHAT_ID = 'test-chat-789';
const DATA_DIR = path.join(__dirname, '..', 'data');
const USER_DIR = path.join(DATA_DIR, TEST_CHAT_ID);
const CONFIG_PATH = path.join(USER_DIR, 'features.json');

beforeEach(() => {
  fs.mkdirSync(USER_DIR, { recursive: true });
  try { fs.unlinkSync(CONFIG_PATH); } catch {}
  delete require.cache[require.resolve('../lib/feature-manager')];
  delete require.cache[require.resolve('../lib/users')];
});

afterEach(() => {
  try { fs.unlinkSync(CONFIG_PATH); } catch {}
  try { fs.rmdirSync(USER_DIR); } catch {}
});

function loadFM() {
  delete require.cache[require.resolve('../lib/feature-manager')];
  const fm = require('../lib/feature-manager');
  fm.loadFeatures();
  fm.loadConfig(TEST_CHAT_ID);
  return fm;
}

describe('feature-manager', () => {
  it('loads all 15 features', () => {
    const fm = loadFM();
    const list = fm.getFeatureList(TEST_CHAT_ID);
    assert.strictEqual(list.length, 15);
  });

  it('all features have required fields', () => {
    const fm = loadFM();
    const list = fm.getFeatureList(TEST_CHAT_ID);
    for (const f of list) {
      assert.ok(f.id, `feature missing id`);
      assert.ok(f.name, `feature ${f.id} missing name`);
      assert.ok(f.description, `feature ${f.id} missing description`);
      assert.strictEqual(typeof f.enabled, 'boolean', `feature ${f.id} enabled not boolean`);
    }
  });

  it('all features enabled by default', () => {
    const fm = loadFM();
    const list = fm.getFeatureList(TEST_CHAT_ID);
    for (const f of list) {
      assert.strictEqual(f.enabled, true, `feature ${f.id} should be enabled by default`);
    }
  });

  it('toggle disables and enables a feature', () => {
    const fm = loadFM();
    assert.strictEqual(fm.isEnabled(TEST_CHAT_ID, 'quiz'), true);

    const newState = fm.toggle(TEST_CHAT_ID, 'quiz');
    assert.strictEqual(newState, false);
    assert.strictEqual(fm.isEnabled(TEST_CHAT_ID, 'quiz'), false);

    const restored = fm.toggle(TEST_CHAT_ID, 'quiz');
    assert.strictEqual(restored, true);
    assert.strictEqual(fm.isEnabled(TEST_CHAT_ID, 'quiz'), true);
  });

  it('toggle returns null for unknown feature', () => {
    const fm = loadFM();
    const result = fm.toggle(TEST_CHAT_ID, 'nonexistent_feature');
    assert.strictEqual(result, null);
  });

  it('config persists to disk', () => {
    const fm = loadFM();
    fm.toggle(TEST_CHAT_ID, 'stickers');

    // Reload from disk
    const fm2 = loadFM();
    assert.strictEqual(fm2.isEnabled(TEST_CHAT_ID, 'stickers'), false);
  });

  it('buildSystemPrompt appends enabled feature prompts', () => {
    const fm = loadFM();
    const base = 'Base prompt.';
    const full = fm.buildSystemPrompt(TEST_CHAT_ID, base);

    assert.ok(full.startsWith(base));
    assert.ok(full.includes('ENABLED FEATURES'));
    assert.ok(full.includes('ANIMAL FACTS'));
  });

  it('buildSystemPrompt excludes disabled feature prompts', () => {
    const fm = loadFM();
    fm.toggle(TEST_CHAT_ID, 'animal_facts');

    const full = fm.buildSystemPrompt(TEST_CHAT_ID, 'Base.');
    assert.ok(!full.includes('ANIMAL FACTS FEATURE'));
  });

  it('buildTools includes enabled feature tools', () => {
    const fm = loadFM();
    const baseTools = [{ type: 'function', function: { name: 'test_tool' } }];
    const tools = fm.buildTools(TEST_CHAT_ID, baseTools);

    assert.ok(tools.length > 1);
    const names = tools.map((t) => t.function?.name || t.name);
    assert.ok(names.includes('test_tool'));
    assert.ok(names.includes('save_animal_name'));
    assert.ok(names.includes('set_birthday'));
  });

  it('buildTools excludes disabled feature tools', () => {
    const fm = loadFM();
    fm.toggle(TEST_CHAT_ID, 'name_the_animal');

    const tools = fm.buildTools(TEST_CHAT_ID, []);
    const names = tools.map((t) => t.function?.name || t.name);
    assert.ok(!names.includes('save_animal_name'));
  });

  it('feature data persists', () => {
    const fm = loadFM();
    fm.setFeatureData(TEST_CHAT_ID, 'birthday', { date: '01-09' });

    const fm2 = loadFM();
    const data = fm2.getFeatureData(TEST_CHAT_ID, 'birthday');
    assert.strictEqual(data.date, '01-09');
  });

  it('findFeatureForTool returns correct feature', () => {
    const fm = loadFM();
    const feature = fm.findFeatureForTool(TEST_CHAT_ID, 'save_animal_name');
    assert.ok(feature);
    assert.strictEqual(feature.id, 'name_the_animal');
  });

  it('findFeatureForTool returns null for unknown tool', () => {
    const fm = loadFM();
    const feature = fm.findFeatureForTool(TEST_CHAT_ID, 'nonexistent_tool');
    assert.strictEqual(feature, null);
  });

  it('findFeatureForTool returns null for disabled feature tool', () => {
    const fm = loadFM();
    fm.toggle(TEST_CHAT_ID, 'name_the_animal');
    const feature = fm.findFeatureForTool(TEST_CHAT_ID, 'save_animal_name');
    assert.strictEqual(feature, null);
  });
});

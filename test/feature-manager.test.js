const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { getDb } = require('../lib/db');

const TEST_CHAT_ID = 'test-chat-789';

beforeEach(() => {
  const db = getDb();
  db.prepare('DELETE FROM feature_config WHERE chat_id = ?').run(TEST_CHAT_ID);
  db.prepare('DELETE FROM feature_data WHERE chat_id = ?').run(TEST_CHAT_ID);
  db.prepare('INSERT OR IGNORE INTO users (chat_id, first_name) VALUES (?, ?)').run(TEST_CHAT_ID, 'Test');
  delete require.cache[require.resolve('../lib/feature-manager')];
});

afterEach(() => {
  const db = getDb();
  db.prepare('DELETE FROM feature_config WHERE chat_id = ?').run(TEST_CHAT_ID);
  db.prepare('DELETE FROM feature_data WHERE chat_id = ?').run(TEST_CHAT_ID);
  db.prepare('DELETE FROM users WHERE chat_id = ?').run(TEST_CHAT_ID);
});

function loadFM() {
  delete require.cache[require.resolve('../lib/feature-manager')];
  const fm = require('../lib/feature-manager');
  fm.loadFeatures();
  fm.loadConfig(TEST_CHAT_ID);
  return fm;
}

describe('feature-manager', () => {
  it('loads all 16 features', () => {
    const fm = loadFM();
    const list = fm.getFeatureList(TEST_CHAT_ID);
    assert.strictEqual(list.length, 16);
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

  it('config persists to database', () => {
    const fm = loadFM();
    fm.toggle(TEST_CHAT_ID, 'stickers');

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

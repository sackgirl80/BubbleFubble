const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('ai provider selection', () => {
  it('defaults to anthropic when AI_PROVIDER not set', () => {
    const saved = process.env.AI_PROVIDER;
    delete process.env.AI_PROVIDER;
    delete require.cache[require.resolve('../lib/ai')];
    const { getProvider } = require('../lib/ai');

    assert.strictEqual(getProvider(), 'anthropic');
    if (saved) process.env.AI_PROVIDER = saved;
  });

  it('returns groq when AI_PROVIDER=groq', () => {
    const saved = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = 'groq';
    delete require.cache[require.resolve('../lib/ai')];
    const { getProvider } = require('../lib/ai');

    assert.strictEqual(getProvider(), 'groq');
    if (saved) process.env.AI_PROVIDER = saved;
    else delete process.env.AI_PROVIDER;
  });

  it('getApiKey returns ANTHROPIC_API_KEY for anthropic provider', () => {
    const savedProvider = process.env.AI_PROVIDER;
    const savedKey = process.env.ANTHROPIC_API_KEY;
    process.env.AI_PROVIDER = 'anthropic';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    delete require.cache[require.resolve('../lib/ai')];
    const { getApiKey } = require('../lib/ai');

    assert.strictEqual(getApiKey(), 'test-anthropic-key');

    if (savedProvider) process.env.AI_PROVIDER = savedProvider;
    else delete process.env.AI_PROVIDER;
    if (savedKey) process.env.ANTHROPIC_API_KEY = savedKey;
    else delete process.env.ANTHROPIC_API_KEY;
  });

  it('getApiKey returns GROQ_API_KEY for groq provider', () => {
    const savedProvider = process.env.AI_PROVIDER;
    const savedKey = process.env.GROQ_API_KEY;
    process.env.AI_PROVIDER = 'groq';
    process.env.GROQ_API_KEY = 'test-groq-key';
    delete require.cache[require.resolve('../lib/ai')];
    const { getApiKey } = require('../lib/ai');

    assert.strictEqual(getApiKey(), 'test-groq-key');

    if (savedProvider) process.env.AI_PROVIDER = savedProvider;
    else delete process.env.AI_PROVIDER;
    if (savedKey) process.env.GROQ_API_KEY = savedKey;
    else delete process.env.GROQ_API_KEY;
  });

  it('returns grok when AI_PROVIDER=grok', () => {
    const saved = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = 'grok';
    delete require.cache[require.resolve('../lib/ai')];
    const { getProvider } = require('../lib/ai');

    assert.strictEqual(getProvider(), 'grok');
    if (saved) process.env.AI_PROVIDER = saved;
    else delete process.env.AI_PROVIDER;
  });

  it('getApiKey returns GROK_API_KEY for grok provider', () => {
    const savedProvider = process.env.AI_PROVIDER;
    const savedKey = process.env.GROK_API_KEY;
    process.env.AI_PROVIDER = 'grok';
    process.env.GROK_API_KEY = 'test-grok-key';
    delete require.cache[require.resolve('../lib/ai')];
    const { getApiKey } = require('../lib/ai');

    assert.strictEqual(getApiKey(), 'test-grok-key');

    if (savedProvider) process.env.AI_PROVIDER = savedProvider;
    else delete process.env.AI_PROVIDER;
    if (savedKey) process.env.GROK_API_KEY = savedKey;
    else delete process.env.GROK_API_KEY;
  });

  it('BASE_PROMPT contains key rules', () => {
    delete require.cache[require.resolve('../lib/ai')];
    const { BASE_PROMPT } = require('../lib/ai');

    assert.ok(BASE_PROMPT.includes('LANGUAGE RULE'));
    assert.ok(BASE_PROMPT.includes('PHOTO RULE'));
    assert.ok(BASE_PROMPT.includes('MEMORY RULE'));
  });

  it('BASE_TOOLS has send_photo, list_features, toggle_feature', () => {
    delete require.cache[require.resolve('../lib/ai')];
    const { BASE_TOOLS } = require('../lib/ai');

    const names = BASE_TOOLS.map((t) => t.function.name);
    assert.ok(names.includes('send_photo'));
    assert.ok(names.includes('list_features'));
    assert.ok(names.includes('toggle_feature'));
  });
});

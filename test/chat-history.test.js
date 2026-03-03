const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const HISTORY_PATH = path.join(__dirname, '..', 'chat-history.json');
let savedHistory;

beforeEach(() => {
  try {
    savedHistory = fs.readFileSync(HISTORY_PATH, 'utf8');
  } catch {
    savedHistory = null;
  }
  try { fs.unlinkSync(HISTORY_PATH); } catch {}
  delete require.cache[require.resolve('../lib/chat-history')];
});

afterEach(() => {
  if (savedHistory !== null) {
    fs.writeFileSync(HISTORY_PATH, savedHistory);
  } else {
    try { fs.unlinkSync(HISTORY_PATH); } catch {}
  }
});

describe('chat-history', () => {
  it('loadChatHistory returns empty messages when no file', () => {
    const { loadChatHistory } = require('../lib/chat-history');
    const h = loadChatHistory();
    assert.deepStrictEqual(h, { messages: [] });
  });

  it('addMessage adds entry with timestamp', () => {
    const { loadChatHistory, addMessage } = require('../lib/chat-history');
    const h = loadChatHistory();
    addMessage(h, 'user', 'hello');

    assert.strictEqual(h.messages.length, 1);
    assert.strictEqual(h.messages[0].role, 'user');
    assert.strictEqual(h.messages[0].text, 'hello');
    assert.ok(h.messages[0].timestamp);
  });

  it('trims to MAX_MESSAGES', () => {
    const { loadChatHistory, addMessage } = require('../lib/chat-history');
    const h = loadChatHistory();

    for (let i = 0; i < 110; i++) {
      addMessage(h, 'user', `message ${i}`);
    }

    assert.strictEqual(h.messages.length, 100);
    assert.strictEqual(h.messages[0].text, 'message 10');
    assert.strictEqual(h.messages[99].text, 'message 109');
  });

  it('persists to disk', () => {
    const { loadChatHistory, addMessage } = require('../lib/chat-history');
    const h = loadChatHistory();
    addMessage(h, 'user', 'test');
    addMessage(h, 'model', 'reply');

    delete require.cache[require.resolve('../lib/chat-history')];
    const { loadChatHistory: reload } = require('../lib/chat-history');
    const h2 = reload();
    assert.strictEqual(h2.messages.length, 2);
    assert.strictEqual(h2.messages[0].text, 'test');
    assert.strictEqual(h2.messages[1].text, 'reply');
  });
});

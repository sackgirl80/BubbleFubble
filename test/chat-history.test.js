const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const TEST_CHAT_ID = 'test-chat-123';
const DATA_DIR = path.join(__dirname, '..', 'data');
const USER_DIR = path.join(DATA_DIR, TEST_CHAT_ID);
const HISTORY_PATH = path.join(USER_DIR, 'chat-history.json');

beforeEach(() => {
  fs.mkdirSync(USER_DIR, { recursive: true });
  try { fs.unlinkSync(HISTORY_PATH); } catch {}
  delete require.cache[require.resolve('../lib/chat-history')];
  delete require.cache[require.resolve('../lib/users')];
});

afterEach(() => {
  try { fs.unlinkSync(HISTORY_PATH); } catch {}
  try { fs.rmdirSync(USER_DIR); } catch {}
});

describe('chat-history', () => {
  it('loadChatHistory returns empty messages when no file', () => {
    const { loadChatHistory } = require('../lib/chat-history');
    const h = loadChatHistory(TEST_CHAT_ID);
    assert.deepStrictEqual(h, { messages: [] });
  });

  it('addMessage adds entry with timestamp', () => {
    const { loadChatHistory, addMessage } = require('../lib/chat-history');
    const h = loadChatHistory(TEST_CHAT_ID);
    addMessage(TEST_CHAT_ID, h, 'user', 'hello');

    assert.strictEqual(h.messages.length, 1);
    assert.strictEqual(h.messages[0].role, 'user');
    assert.strictEqual(h.messages[0].text, 'hello');
    assert.ok(h.messages[0].timestamp);
  });

  it('trims to MAX_MESSAGES', () => {
    const { loadChatHistory, addMessage } = require('../lib/chat-history');
    const h = loadChatHistory(TEST_CHAT_ID);

    for (let i = 0; i < 110; i++) {
      addMessage(TEST_CHAT_ID, h, 'user', `message ${i}`);
    }

    assert.strictEqual(h.messages.length, 100);
    assert.strictEqual(h.messages[0].text, 'message 10');
    assert.strictEqual(h.messages[99].text, 'message 109');
  });

  it('persists to disk', () => {
    const { loadChatHistory, addMessage } = require('../lib/chat-history');
    const h = loadChatHistory(TEST_CHAT_ID);
    addMessage(TEST_CHAT_ID, h, 'user', 'test');
    addMessage(TEST_CHAT_ID, h, 'model', 'reply');

    delete require.cache[require.resolve('../lib/chat-history')];
    const { loadChatHistory: reload } = require('../lib/chat-history');
    const h2 = reload(TEST_CHAT_ID);
    assert.strictEqual(h2.messages.length, 2);
    assert.strictEqual(h2.messages[0].text, 'test');
    assert.strictEqual(h2.messages[1].text, 'reply');
  });
});

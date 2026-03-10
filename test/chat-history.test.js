const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { getDb, closeDb } = require('../lib/db');

const TEST_CHAT_ID = 'test-chat-123';

beforeEach(() => {
  const db = getDb();
  db.prepare('DELETE FROM chat_history WHERE chat_id = ?').run(TEST_CHAT_ID);
  db.prepare('INSERT OR IGNORE INTO users (chat_id, first_name) VALUES (?, ?)').run(TEST_CHAT_ID, 'Test');
  delete require.cache[require.resolve('../lib/chat-history')];
});

afterEach(() => {
  const db = getDb();
  db.prepare('DELETE FROM chat_history WHERE chat_id = ?').run(TEST_CHAT_ID);
  db.prepare('DELETE FROM users WHERE chat_id = ?').run(TEST_CHAT_ID);
});

describe('chat-history', () => {
  it('loadChatHistory returns empty messages when no data', () => {
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

  it('persists to database', () => {
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

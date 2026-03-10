const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { getDb, closeDb } = require('../lib/db');

const TEST_CHAT_ID = 'test-chat-456';

beforeEach(() => {
  const db = getDb();
  db.prepare('DELETE FROM sent_photos WHERE chat_id = ?').run(TEST_CHAT_ID);
  db.prepare('INSERT OR IGNORE INTO users (chat_id, first_name) VALUES (?, ?)').run(TEST_CHAT_ID, 'Test');
  delete require.cache[require.resolve('../lib/history')];
});

afterEach(() => {
  const db = getDb();
  db.prepare('DELETE FROM sent_photos WHERE chat_id = ?').run(TEST_CHAT_ID);
  db.prepare('DELETE FROM users WHERE chat_id = ?').run(TEST_CHAT_ID);
});

describe('history', () => {
  it('loadHistory returns empty sent array when no data', () => {
    const { loadHistory } = require('../lib/history');
    const h = loadHistory(TEST_CHAT_ID);
    assert.deepStrictEqual(h, { sent: [] });
  });

  it('recordSent adds entry with timestamp', () => {
    const { loadHistory, recordSent } = require('../lib/history');
    const h = loadHistory(TEST_CHAT_ID);
    recordSent(TEST_CHAT_ID, h, { id: 'test-1', url: 'http://example.com/1.jpg', source: 'test' });

    assert.strictEqual(h.sent.length, 1);
    assert.strictEqual(h.sent[0].id, 'test-1');
    assert.ok(h.sent[0].sentAt);
  });

  it('isAlreadySent detects duplicates', () => {
    const { loadHistory, recordSent, isAlreadySent } = require('../lib/history');
    const h = loadHistory(TEST_CHAT_ID);
    recordSent(TEST_CHAT_ID, h, { id: 'test-1', url: 'http://example.com/1.jpg', source: 'test' });

    assert.strictEqual(isAlreadySent(h, 'test-1'), true);
    assert.strictEqual(isAlreadySent(h, 'test-2'), false);
  });

  it('history persists to database', () => {
    const { loadHistory, recordSent } = require('../lib/history');
    const h = loadHistory(TEST_CHAT_ID);
    recordSent(TEST_CHAT_ID, h, { id: 'test-1', url: 'http://example.com/1.jpg', source: 'test' });

    delete require.cache[require.resolve('../lib/history')];
    const { loadHistory: reload } = require('../lib/history');
    const h2 = reload(TEST_CHAT_ID);
    assert.strictEqual(h2.sent.length, 1);
    assert.strictEqual(h2.sent[0].id, 'test-1');
  });
});

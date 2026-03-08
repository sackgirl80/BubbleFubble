const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const TEST_CHAT_ID = 'test-chat-456';
const DATA_DIR = path.join(__dirname, '..', 'data');
const USER_DIR = path.join(DATA_DIR, TEST_CHAT_ID);
const HISTORY_PATH = path.join(USER_DIR, 'sent-photos.json');

beforeEach(() => {
  fs.mkdirSync(USER_DIR, { recursive: true });
  try { fs.unlinkSync(HISTORY_PATH); } catch {}
  delete require.cache[require.resolve('../lib/history')];
  delete require.cache[require.resolve('../lib/users')];
});

afterEach(() => {
  try { fs.unlinkSync(HISTORY_PATH); } catch {}
  try { fs.rmdirSync(USER_DIR); } catch {}
});

describe('history', () => {
  it('loadHistory returns empty sent array when no file', () => {
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

  it('history persists to disk', () => {
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

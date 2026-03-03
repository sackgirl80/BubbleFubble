const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const HISTORY_PATH = path.join(__dirname, '..', 'sent-photos.json');
let savedHistory;

beforeEach(() => {
  try {
    savedHistory = fs.readFileSync(HISTORY_PATH, 'utf8');
  } catch {
    savedHistory = null;
  }
  try { fs.unlinkSync(HISTORY_PATH); } catch {}
  delete require.cache[require.resolve('../lib/history')];
});

afterEach(() => {
  if (savedHistory !== null) {
    fs.writeFileSync(HISTORY_PATH, savedHistory);
  } else {
    try { fs.unlinkSync(HISTORY_PATH); } catch {}
  }
});

describe('history', () => {
  it('loadHistory returns empty sent array when no file', () => {
    const { loadHistory } = require('../lib/history');
    const h = loadHistory();
    assert.deepStrictEqual(h, { sent: [] });
  });

  it('recordSent adds entry with timestamp', () => {
    const { loadHistory, recordSent } = require('../lib/history');
    const h = loadHistory();
    recordSent(h, { id: 'test-1', url: 'http://example.com/1.jpg', source: 'test' });

    assert.strictEqual(h.sent.length, 1);
    assert.strictEqual(h.sent[0].id, 'test-1');
    assert.ok(h.sent[0].sentAt);
  });

  it('isAlreadySent detects duplicates', () => {
    const { loadHistory, recordSent, isAlreadySent } = require('../lib/history');
    const h = loadHistory();
    recordSent(h, { id: 'test-1', url: 'http://example.com/1.jpg', source: 'test' });

    assert.strictEqual(isAlreadySent(h, 'test-1'), true);
    assert.strictEqual(isAlreadySent(h, 'test-2'), false);
  });

  it('history persists to disk', () => {
    const { loadHistory, recordSent } = require('../lib/history');
    const h = loadHistory();
    recordSent(h, { id: 'test-1', url: 'http://example.com/1.jpg', source: 'test' });

    delete require.cache[require.resolve('../lib/history')];
    const { loadHistory: reload } = require('../lib/history');
    const h2 = reload();
    assert.strictEqual(h2.sent.length, 1);
    assert.strictEqual(h2.sent[0].id, 'test-1');
  });
});

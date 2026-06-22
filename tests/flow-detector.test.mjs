import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FlowDetector } from '../.opencode/plugin/zara/empathy/flow-detector.mjs';

describe('FlowDetector', () => {
  it('returns false with fewer than 3 messages', () => {
    const fd = new FlowDetector();
    fd.timestamps = [Date.now(), Date.now() + 1000];
    assert.equal(fd.isInFlow(), false);
  });

  it('returns true with 3+ messages and avg gap < 90s', () => {
    const fd = new FlowDetector();
    const now = Date.now();
    fd.timestamps = [now - 60000, now - 30000, now];
    assert.equal(fd.isInFlow(), true);
  });

  it('returns false with 3+ messages and avg gap >= 90s', () => {
    const fd = new FlowDetector();
    const now = Date.now();
    fd.timestamps = [now - 200000, now - 100000, now];
    assert.equal(fd.isInFlow(), false);
  });

  it('expires messages older than 5 minutes', () => {
    const fd = new FlowDetector();
    const now = Date.now();
    fd.timestamps = [now - 400000, now - 350000, now - 310000, now - 10000, now - 5000, now];
    // After recordMessage, old ones should be pruned
    fd.recordMessage();
    // Only recent ones should remain (last ~5min)
    assert.ok(fd.timestamps.length <= 4);
  });

  it('exactly 90000ms gap returns false (strict <)', () => {
    const fd = new FlowDetector();
    const now = Date.now();
    fd.timestamps = [now - 180000, now - 90000, now];
    // avg gap = 90000ms exactly, which is NOT < 90000
    assert.equal(fd.isInFlow(), false);
  });
});

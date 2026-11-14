import test from 'node:test';
import assert from 'node:assert/strict';
import { isPingQuietTime, PING_INTERVAL_MS, startScheduledPing } from '../src/services/scheduledPing.js';

test('quiet hours use IST at both boundaries, independent of the server timezone', () => {
  for (const [utc, quiet] of [
    ['2026-11-13T19:29:59Z', false], // 00:59:59 IST
    ['2026-11-13T19:30:00Z', true],  // 01:00 IST
    ['2026-11-13T23:29:59Z', true],  // 04:59:59 IST
    ['2026-11-13T23:30:00Z', false], // 05:00 IST
    ['2026-11-14T18:30:00Z', false]  // midnight IST
  ]) assert.equal(isPingQuietTime(new Date(utc)), quiet, utc);
});

const logger = { info() {}, warn() {} };

test('20-minute schedule skips nights, resumes without a burst and cleans up', async () => {
  let tick, delay, cancelled = false;
  let current = new Date('2026-11-13T19:30:00Z');
  const requests = [];
  const timer = { unref() {} };
  const stop = startScheduledPing({ enabled: true, origin: 'https://brandguard-bk3c.onrender.com',
    now: () => current, logger,
    schedule(callback, ms) { tick = callback; delay = ms; return timer; },
    cancel(value) { assert.equal(value, timer); cancelled = true; },
    async fetchRequest(url) { requests.push(url); return { ok: true }; }
  });
  assert.equal(delay, PING_INTERVAL_MS);
  assert.equal(delay, 1200000);
  assert.equal(requests.length, 0); // No immediate request, even on manual startup.
  await tick();
  assert.equal(requests.length, 0);
  current = new Date('2026-11-13T23:30:00Z');
  await tick();
  assert.deepEqual(requests, ['https://brandguard-bk3c.onrender.com/api/health']);
  stop();
  await tick();
  assert.equal(requests.length, 1);
  assert.ok(cancelled);
});

test('overlapping pings are skipped and network failures are contained', async () => {
  let tick, rejectRequest, calls = 0;
  const stop = startScheduledPing({ enabled: true, now: () => new Date('2026-11-14T06:00:00Z'), logger,
    schedule(callback) { tick = callback; return { unref() {} }; }, cancel() {},
    fetchRequest() { calls++; return new Promise((resolve, reject) => { rejectRequest = reject; }); }
  });
  const pending = tick();
  await tick();
  assert.equal(calls, 1);
  rejectRequest(new Error('Network unavailable'));
  await pending;
  stop();
});

test('disabled and invalid configurations do not schedule network work', () => {
  const schedule = () => assert.fail('must not schedule');
  startScheduledPing({ enabled: false, schedule, logger })();
  startScheduledPing({ enabled: true, origin: 'invalid', schedule, logger })();
  startScheduledPing({ enabled: true, origin: 'http://example.com', schedule, logger })();
});

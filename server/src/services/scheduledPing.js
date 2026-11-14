export const PING_INTERVAL_MS = 20 * 60 * 1000;
const DEFAULT_ORIGIN = 'https://brandguard-bk3c.onrender.com';
const indiaHour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hourCycle: 'h23' });

export function isPingQuietTime(date = new Date()) {
  const hour = Number(indiaHour.format(date));
  return hour >= 1 && hour < 5;
}

// This is an in-process timer. It cannot wake a Render instance that has spun down.
export function startScheduledPing({
  enabled = process.env.SELF_PING_ENABLED !== 'false' && process.env.NODE_ENV === 'production',
  origin = process.env.SELF_PING_URL || process.env.RENDER_EXTERNAL_URL || DEFAULT_ORIGIN,
  now = () => new Date(),
  fetchRequest = globalThis.fetch,
  schedule = globalThis.setInterval,
  cancel = globalThis.clearInterval,
  logger = console
} = {}) {
  if (!enabled) return () => {};
  let target;
  try {
    target = new URL('/api/health', origin);
    if (target.protocol !== 'https:' || target.username || target.password) throw new Error('Expected an HTTPS origin without credentials.');
  } catch {
    logger.warn('Scheduled health ping disabled: SELF_PING_URL must be a valid HTTPS origin.');
    return () => {};
  }

  let stopped = false;
  let inFlight = false;
  let controller;
  const tick = async () => {
    if (stopped || inFlight || isPingQuietTime(now())) return;
    inFlight = true;
    controller = new AbortController();
    const timeout = setTimeout(() => controller?.abort(), 10000);
    timeout.unref?.();
    try {
      const response = await fetchRequest(target.href, { signal: controller.signal, redirect: 'error' });
      await response.body?.cancel();
      if (!response.ok) logger.warn(`Scheduled health ping returned HTTP ${response.status}.`);
    } catch {
      if (!stopped) logger.warn('Scheduled health ping failed or timed out; waiting for the next interval.');
    } finally {
      clearTimeout(timeout);
      inFlight = false;
      controller = null;
    }
  };

  // No startup ping or catch-up burst after quiet hours. Manual requests remain available.
  const timer = schedule(tick, PING_INTERVAL_MS);
  timer.unref?.();
  logger.info('Health ping scheduled every 20 minutes; paused 01:00–05:00 Asia/Kolkata. This timer cannot wake a sleeping service or enforce the shared Render quota.');
  return () => {
    stopped = true;
    cancel(timer);
    controller?.abort();
  };
}

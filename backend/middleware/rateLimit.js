// Pembatas percobaan login sederhana (in-memory) untuk mencegah tebak sandi.
function createRateLimiter({ windowMs, max, keyFn, message }) {
  const hits = new Map();
  const timer = setInterval(() => {
    const t = Date.now();
    for (const [k, v] of hits) if (v.reset <= t) hits.delete(k);
  }, windowMs);
  if (timer.unref) timer.unref();

  const middleware = (req, res, next) => {
    const key = keyFn(req);
    const t = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.reset <= t) {
      entry = { count: 0, reset: t + windowMs };
      hits.set(key, entry);
    }
    entry.count++;
    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.reset - t) / 1000));
      return res.status(429).json({ success: false, message });
    }
    next();
  };
  middleware.reset = () => hits.clear();
  return middleware;
}

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 20,
  keyFn: (req) => `${req.ip}|${String((req.body && req.body.email) || '').toLowerCase()}`,
  message: 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.'
});

module.exports = { createRateLimiter, loginLimiter };

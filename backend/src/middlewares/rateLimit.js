// Rate limiter sederhana tanpa dependency tambahan.
// Catatan: penyimpanan bersifat in-memory per proses, cukup untuk
// satu instance backend. Bila backend di-scale horizontal, gunakan
// penyimpanan bersama (mis. Redis).

function readPositiveInteger(value, fallback, { min = 1, max = 60000 } = {}) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return fallback;

  const rounded = Math.floor(parsed);

  if (rounded < min || rounded > max) return fallback;

  return rounded;
}

function createRateLimiter({
  windowMs = 60000,
  max = 60,
  keyGenerator = (req) => req.ip,
  message = "Terlalu banyak permintaan, coba lagi nanti",
} = {}) {
  const hits = new Map();

  // Bersihkan entri kedaluwarsa agar Map tidak tumbuh tanpa batas.
  const cleanupTimer = setInterval(() => {
    const now = Date.now();

    for (const [key, record] of hits) {
      if (record.resetAt <= now) hits.delete(key);
    }
  }, windowMs);

  if (typeof cleanupTimer.unref === "function") cleanupTimer.unref();

  function middleware(req, res, next) {
    const key = String(keyGenerator(req) || "unknown");
    const now = Date.now();

    let record = hits.get(key);

    if (!record || record.resetAt <= now) {
      record = { count: 0, resetAt: now + windowMs };
      hits.set(key, record);
    }

    record.count += 1;

    const remaining = Math.max(0, max - record.count);

    res.set({
      "RateLimit-Limit": String(max),
      "RateLimit-Remaining": String(remaining),
      "RateLimit-Reset": String(Math.ceil(record.resetAt / 1000)),
    });

    if (record.count > max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((record.resetAt - now) / 1000)
      );

      res.set("Retry-After", String(retryAfterSeconds));

      return res.status(429).json({ message });
    }

    next();
  }

  middleware.reset = () => hits.clear();

  return middleware;
}

const webhookRateLimiter = createRateLimiter({
  windowMs: readPositiveInteger(
    process.env.MIDTRANS_WEBHOOK_RATE_LIMIT_WINDOW_MS,
    60000,
    { min: 1000, max: 3600000 }
  ),
  max: readPositiveInteger(process.env.MIDTRANS_WEBHOOK_RATE_LIMIT_MAX, 60, {
    min: 1,
    max: 10000,
  }),
  message: "Terlalu banyak notifikasi pembayaran",
});

module.exports = { createRateLimiter, webhookRateLimiter };

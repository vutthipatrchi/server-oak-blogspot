function positiveInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function createRateLimiter({ limit, windowMs, message }) {
  const requests = new Map()

  return function rateLimit(req, res, next) {
    const now = Date.now()
    const key = req.ip || req.socket?.remoteAddress || 'unknown'
    const current = requests.get(key)
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current

    entry.count += 1
    requests.set(key, entry)

    res.set('RateLimit-Limit', String(limit))
    res.set('RateLimit-Remaining', String(Math.max(0, limit - entry.count)))
    res.set('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)))

    if (entry.count > limit) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))))
      return res.status(429).json({ error: message })
    }

    if (requests.size > 10_000) {
      for (const [storedKey, stored] of requests) {
        if (stored.resetAt <= now) requests.delete(storedKey)
      }
    }
    next()
  }
}

export const loginRateLimit = createRateLimiter({
  limit: positiveInteger(process.env.AUTH_LOGIN_RATE_LIMIT, 10),
  windowMs: 15 * 60 * 1000,
  message: 'Too many login attempts. Please try again later.',
})

export const signupRateLimit = createRateLimiter({
  limit: positiveInteger(process.env.AUTH_SIGNUP_RATE_LIMIT, 5),
  windowMs: 60 * 60 * 1000,
  message: 'Too many signup attempts. Please try again later.',
})

export const refreshRateLimit = createRateLimiter({
  limit: positiveInteger(process.env.AUTH_REFRESH_RATE_LIMIT, 30),
  windowMs: 15 * 60 * 1000,
  message: 'Too many session refresh attempts. Please try again later.',
})

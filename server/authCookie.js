const cookieName = 'hh.refresh'

function cookieSettings() {
  const configuredSameSite = process.env.AUTH_COOKIE_SAME_SITE?.trim().toLowerCase()
  const sameSite = ['strict', 'lax', 'none'].includes(configuredSameSite)
    ? configuredSameSite
    : 'lax'
  const secure = process.env.AUTH_COOKIE_SECURE === 'true'
    || process.env.NODE_ENV === 'production'
    || sameSite === 'none'
  const maxAge = Number(process.env.AUTH_REFRESH_COOKIE_MAX_AGE_SECONDS) || 60 * 60 * 24 * 30
  return { maxAge, sameSite, secure }
}

function serializeCookie(value, maxAge) {
  const settings = cookieSettings()
  const parts = [
    `${cookieName}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${settings.sameSite[0].toUpperCase()}${settings.sameSite.slice(1)}`,
    `Max-Age=${maxAge}`,
  ]
  if (settings.secure) parts.push('Secure')
  return parts.join('; ')
}

export function getRefreshToken(req) {
  const cookies = (req.get('cookie') ?? '').split(';')
  for (const cookie of cookies) {
    const separator = cookie.indexOf('=')
    if (separator < 0 || cookie.slice(0, separator).trim() !== cookieName) continue
    try {
      return decodeURIComponent(cookie.slice(separator + 1).trim())
    } catch {
      return ''
    }
  }
  return ''
}

export function setRefreshCookie(res, refreshToken) {
  res.append('Set-Cookie', serializeCookie(refreshToken, cookieSettings().maxAge))
}

export function clearRefreshCookie(res) {
  res.append('Set-Cookie', serializeCookie('', 0))
}

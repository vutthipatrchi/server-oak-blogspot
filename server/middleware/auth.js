import { authClient, canWriteWithSupabase, supabase } from '../supabase.js'

export function requireSupabase(_req, res, next) {
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase is not configured on the server.' })
  }

  next()
}

export async function requireMember(req, res, next) {
  const authorization = req.get('authorization') ?? ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''

  if (!token) {
    return res.status(401).json({ error: 'Authentication is required.' })
  }
  if (!authClient) {
    return res.status(503).json({ error: 'Supabase Auth is not configured on the server.' })
  }

  const { data, error } = await authClient.auth.getUser(token)
  if (error || !data.user) {
    return res.status(401).json({ error: 'Session is invalid or expired.' })
  }

  req.user = data.user
  req.accessToken = token
  next()
}

export async function requireAdmin(req, res, next) {
  const adminApiKey = process.env.ADMIN_API_KEY
  const requestKey = req.get('x-admin-api-key')

  if (adminApiKey && requestKey === adminApiKey) {
    if (!canWriteWithSupabase) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is required for writes.' })
    }
    return next()
  }

  await requireMember(req, res, () => {
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
    const isAdmin = req.user?.app_metadata?.role === 'admin'
      || (adminEmail && req.user?.email?.toLowerCase() === adminEmail)

    if (!isAdmin) {
      return res.status(403).json({ error: 'Administrator access is required.' })
    }
    if (!canWriteWithSupabase) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is required for writes.' })
    }
    next()
  })
}

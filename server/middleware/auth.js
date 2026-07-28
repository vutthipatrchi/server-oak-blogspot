import { canWriteWithSupabase, supabase } from '../supabase.js'

export function requireSupabase(_req, res, next) {
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase is not configured on the server.' })
  }

  next()
}

export function requireAdmin(req, res, next) {
  const adminApiKey = process.env.ADMIN_API_KEY
  const requestKey = req.get('x-admin-api-key')

  if (!adminApiKey || requestKey !== adminApiKey) {
    return res.status(401).json({ error: 'Admin API key is required.' })
  }

  if (!canWriteWithSupabase) {
    return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is required for writes.' })
  }

  next()
}

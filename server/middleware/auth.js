import { timingSafeEqual } from 'node:crypto'
import { authClient, canWriteWithSupabase, supabase } from '../supabase.js'
import * as memberRepository from '../repositories/memberRepository.js'
import { canManageArticles, configuredOwnerEmail, isOwner } from '../roles.js'

function matchesSecret(actual, expected) {
  if (!actual || !expected) return false
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer)
}

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
  return next()
}

// Public reads gain draft access only after verifying administrator credentials.
export async function resolveArticleReadAccess(req, res, next) {
  req.canReadDrafts = false
  res.set('Cache-Control', 'private, no-store')
  if (matchesSecret(req.get('x-admin-api-key'), process.env.ADMIN_API_KEY)) {
    req.canReadDrafts = true
    return next()
  }
  if (!req.get('authorization')) return next()

  return requireMember(req, res, async () => {
    const profile = await memberRepository.findMemberProfile(req.user.id)
    const ownerEmail = configuredOwnerEmail()
    req.canReadDrafts = Boolean(canManageArticles(profile?.role)
      || canManageArticles(req.user?.app_metadata?.role)
      || (ownerEmail && req.user?.email?.toLowerCase() === ownerEmail))
    return next()
  })
}

export async function requireAdmin(req, res, next) {
  const adminApiKey = process.env.ADMIN_API_KEY
  const requestKey = req.get('x-admin-api-key')

  if (matchesSecret(requestKey, adminApiKey)) {
    if (!canWriteWithSupabase) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is required for writes.' })
    }
    return next()
  }

  await requireMember(req, res, async () => {
    const profile = await memberRepository.findMemberProfile(req.user.id)
    const ownerEmail = configuredOwnerEmail()
    const metadataRole = req.user?.app_metadata?.role
    const isAdmin = canManageArticles(profile?.role)
      || canManageArticles(metadataRole)
      || (ownerEmail && req.user?.email?.toLowerCase() === ownerEmail)

    if (!isAdmin) {
      return res.status(403).json({ error: 'Administrator access is required.' })
    }
    if (!canWriteWithSupabase) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is required for writes.' })
    }
    next()
  })
}

export async function requireOwner(req, res, next) {
  if (matchesSecret(req.get('x-admin-api-key'), process.env.ADMIN_API_KEY)) {
    if (!canWriteWithSupabase) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is required for writes.' })
    }
    return next()
  }

  await requireMember(req, res, async () => {
    const profile = await memberRepository.findMemberProfile(req.user.id)
    const ownerEmail = configuredOwnerEmail()
    const hasOwnerRole = isOwner(profile?.role)
      || isOwner(req.user?.app_metadata?.role)
      || (ownerEmail && req.user?.email?.toLowerCase() === ownerEmail)

    if (!hasOwnerRole) return res.status(403).json({ error: 'Owner access is required.' })
    if (!canWriteWithSupabase) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is required for writes.' })
    }
    next()
  })
}

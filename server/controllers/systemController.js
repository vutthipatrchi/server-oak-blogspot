import { canWriteWithSupabase, isSupabaseConfigured } from '../supabase.js'

export function apiInfo(_req, res) {
  res.json({
    name: 'server-oak-blogspot',
    status: 'ok',
    endpoints: {
      health: '/health',
      apiHealth: '/api/health',
      articles: '/api/articles',
      auth: '/api/auth',
      categories: '/api/categories',
      profile: '/api/profile',
      notifications: '/api/notifications',
    },
  })
}

export function basicHealth(_req, res) {
  res.json({ status: 'ok' })
}

export function health(_req, res) {
  res.json({
    ok: true,
    supabaseConfigured: isSupabaseConfigured,
    writesEnabled: canWriteWithSupabase,
  })
}

export function notifications(_req, res) {
  res.json({
    notifications: [
      {
        id: 1,
        title: 'Article needs review',
        detail: 'A draft article is waiting for review.',
        target: '/admin/articles',
      },
      {
        id: 2,
        title: 'Profile reminder',
        detail: 'Keep your author profile up to date.',
        target: '/admin/profile',
      },
    ],
  })
}

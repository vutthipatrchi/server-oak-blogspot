import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { canWriteWithSupabase, isSupabaseConfigured } from '../supabase.js'

export const systemRouter = Router()

systemRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    supabaseConfigured: isSupabaseConfigured,
    writesEnabled: canWriteWithSupabase,
  })
})

systemRouter.get('/notifications', (_req, res) => {
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
})

systemRouter.post('/reset-password', requireAdmin, (req, res) => {
  if (!req.body.currentPassword || !req.body.newPassword || req.body.newPassword.length < 8) {
    return res.status(400).json({
      error: 'Current password and a new password of at least 8 characters are required.',
    })
  }

  res.json({ message: 'Password reset request completed.' })
})

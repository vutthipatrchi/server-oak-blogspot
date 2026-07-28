import { Router } from 'express'
import { requireAdmin, requireSupabase } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'
import { supabase } from '../supabase.js'

export const profileRouter = Router()

profileRouter.use(requireSupabase)

profileRouter.get('/', asyncHandler(async (_req, res) => {
  const { data, error } = await supabase
    .from('admin_profiles')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error) throw error
  res.json({ profile: data ?? { name: '', email: '', bio: '', avatar_url: '' } })
}))

profileRouter.put('/', requireAdmin, asyncHandler(async (req, res) => {
  const profile = {
    id: 1,
    name: req.body.name,
    email: req.body.email,
    bio: req.body.bio ?? '',
    avatar_url: req.body.avatar_url ?? '',
  }
  const { data, error } = await supabase
    .from('admin_profiles')
    .upsert(profile)
    .select()
    .single()

  if (error) throw error
  res.json({ profile: data })
}))

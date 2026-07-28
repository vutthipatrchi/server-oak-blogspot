import { Router } from 'express'
import { requireAdmin, requireSupabase } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'
import { supabase } from '../supabase.js'

export const categoriesRouter = Router()

categoriesRouter.use(requireSupabase)

categoriesRouter.get('/', asyncHandler(async (req, res) => {
  let query = supabase.from('categories').select('*').order('name')
  if (req.query.search) query = query.ilike('name', `%${req.query.search}%`)

  const { data, error } = await query
  if (error) throw error
  res.json({ categories: data ?? [] })
}))

categoriesRouter.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const name = String(req.body.name ?? '').trim()
  if (!name) return res.status(400).json({ error: 'name is required.' })

  const { data, error } = await supabase
    .from('categories')
    .insert({ name, description: req.body.description ?? '' })
    .select()
    .single()

  if (error) throw error
  res.status(201).json({ category: data })
}))

categoriesRouter.patch('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('categories')
    .update({ name: req.body.name, description: req.body.description ?? '' })
    .eq('id', Number(req.params.id))
    .select()
    .single()

  if (error) throw error
  res.json({ category: data })
}))

categoriesRouter.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', Number(req.params.id))

  if (error) throw error
  res.status(204).send()
}))

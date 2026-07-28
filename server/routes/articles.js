import { Router } from 'express'
import { toArticle, toArticleInsert, toArticleUpdate } from '../articleMapper.js'
import { requireAdmin, requireSupabase } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'
import { supabase } from '../supabase.js'

export const articlesRouter = Router()

const articleSelect = `
  id, category, tags, title, status, excerpt, image_url, author, author_avatar,
  author_bio, display_date, published_at, likes, sections, source,
  comments (id, author, avatar, display_date, created_at, text)
`

articlesRouter.use(requireSupabase)

articlesRouter.get('/', asyncHandler(async (req, res) => {
  let query = supabase
    .from('articles')
    .select(articleSelect)
    .order('published_at', { ascending: false, nullsFirst: false })

  if (req.query.status) query = query.eq('status', req.query.status)
  if (req.query.category) query = query.eq('category', req.query.category)
  if (req.query.search) query = query.ilike('title', `%${req.query.search}%`)

  const { data, error } = await query
  if (error) throw error

  res.json({ articles: (data ?? []).map(toArticle) })
}))

articlesRouter.get('/:id', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('articles')
    .select(articleSelect)
    .eq('id', Number(req.params.id))
    .single()

  if (error) throw error
  res.json({ article: toArticle(data) })
}))

articlesRouter.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const article = toArticleInsert(req.body)

  if (!article.title || !article.excerpt || !article.author) {
    return res.status(400).json({ error: 'title, excerpt, and author are required.' })
  }

  const { data, error } = await supabase
    .from('articles')
    .insert(article)
    .select(articleSelect)
    .single()

  if (error) throw error
  res.status(201).json({ article: toArticle(data) })
}))

articlesRouter.patch('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('articles')
    .update(toArticleUpdate(req.body))
    .eq('id', Number(req.params.id))
    .select(articleSelect)
    .single()

  if (error) throw error
  res.json({ article: toArticle(data) })
}))

articlesRouter.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', Number(req.params.id))

  if (error) throw error
  res.status(204).send()
}))

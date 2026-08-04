import { supabase } from '../supabase.js'

export const articleSelect = `
  id, category_id, category_record:categories!articles_category_id_fkey(id, name, description),
  tags, title, status, excerpt, image_url, author_id, author, author_avatar,
  author_bio, display_date, published_at, likes, sections, source,
  comments (id, author, avatar, display_date, created_at, text)
`

export async function findArticles({ status, categoryId, search }) {
  let query = supabase
    .from('articles')
    .select(articleSelect)
    .order('published_at', { ascending: false, nullsFirst: false })

  if (status) query = query.eq('status', status)
  if (categoryId) query = query.eq('category_id', categoryId)
  if (search) query = query.ilike('title', `%${search}%`)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function findArticleById(id) {
  const { data, error } = await supabase
    .from('articles')
    .select(articleSelect)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function insertArticle(article) {
  const { data, error } = await supabase
    .from('articles')
    .insert(article)
    .select(articleSelect)
    .single()

  if (error) throw error
  return data
}

export async function updateArticleById(id, article) {
  const { data, error } = await supabase
    .from('articles')
    .update(article)
    .eq('id', id)
    .select(articleSelect)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function deleteArticleById(id) {
  const { data, error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) throw error
  return data
}

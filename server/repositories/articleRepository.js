import { supabase } from '../supabase.js'

export const articleSelect = `
  id, category_id, category_record:categories!articles_category_id_fkey(id, name, description),
  tags, title, status, excerpt, image_url, author_id, author, author_avatar,
  author_bio, display_date, published_at, likes, sections, source,
  comments (id, member_id, reply_to_comment_id, author, avatar, display_date, created_at, text, comment_likes(count))
`

export async function findArticles({ status, categoryId, search, page, limit }) {
  let query = supabase
    .from('articles')
    .select(articleSelect, limit ? { count: 'exact' } : undefined)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false })

  if (status) query = query.eq('status', status)
  if (categoryId) query = query.eq('category_id', categoryId)
  if (search) {
    const safeSearch = search.replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim()
    if (safeSearch) {
      query = query.or(`title.ilike.%${safeSearch}%,excerpt.ilike.%${safeSearch}%,author.ilike.%${safeSearch}%`)
    }
  }
  if (limit) {
    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)
  }

  const { data, error, count } = await query
  if (error) throw error
  return { rows: data ?? [], total: count ?? data?.length ?? 0 }
}

export async function findArticleById(id, status) {
  let query = supabase.from('articles').select(articleSelect).eq('id', id)
  if (status) query = query.eq('status', status)
  const { data, error } = await query.maybeSingle()

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

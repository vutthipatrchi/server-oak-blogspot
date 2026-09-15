import { supabase } from '../supabase.js'

const commentSelect = 'id, member_id, author, avatar, display_date, created_at, text'

export async function insertComment(comment) {
  const { data, error } = await supabase.from('comments').insert(comment).select(commentSelect).single()
  if (error) throw error
  return data
}

export async function deleteComment(articleId, commentId, memberId) {
  const { data, error } = await supabase.from('comments').delete()
    .eq('id', commentId).eq('article_id', articleId).eq('member_id', memberId)
    .select('id').maybeSingle()
  if (error) throw error
  return data
}

export async function findLike(articleId, memberId) {
  const { data, error } = await supabase.from('article_likes').select('article_id')
    .eq('article_id', articleId).eq('member_id', memberId).maybeSingle()
  if (error) throw error
  return data
}

export async function insertLike(articleId, memberId) {
  const { error } = await supabase.from('article_likes').insert({ article_id: articleId, member_id: memberId })
  if (error) throw error
}

export async function deleteLike(articleId, memberId) {
  const { error } = await supabase.from('article_likes').delete()
    .eq('article_id', articleId).eq('member_id', memberId)
  if (error) throw error
}

export async function getArticleLikeCount(articleId) {
  const { data, error } = await supabase.from('articles').select('likes')
    .eq('id', articleId).maybeSingle()
  if (error) throw error
  return data?.likes ?? 0
}

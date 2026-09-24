import { supabase } from '../supabase.js'

const commentSelect = 'id, member_id, author, avatar, display_date, created_at, text, reply_to_comment_id'

export async function findComment(commentId) {
  const { data, error } = await supabase.from('comments')
    .select('id, article_id, member_id, reply_to_comment_id')
    .eq('id', commentId).maybeSingle()
  if (error) throw error
  return data
}

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

export async function findCommentLike(commentId, memberId) {
  const { data, error } = await supabase.from('comment_likes').select('comment_id')
    .eq('comment_id', commentId).eq('member_id', memberId).maybeSingle()
  if (error) throw error
  return data
}

export async function insertCommentLike(commentId, memberId) {
  const { error } = await supabase.from('comment_likes').insert({ comment_id: commentId, member_id: memberId })
  if (error) throw error
}

export async function deleteCommentLike(commentId, memberId) {
  const { error } = await supabase.from('comment_likes').delete()
    .eq('comment_id', commentId).eq('member_id', memberId)
  if (error) throw error
}

export async function getCommentLikeCount(commentId) {
  const { count, error } = await supabase.from('comment_likes').select('comment_id', { count: 'exact', head: true })
    .eq('comment_id', commentId)
  if (error) throw error
  return count ?? 0
}

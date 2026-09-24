import { HttpError } from '../errors/HttpError.js'
import { toComment } from '../mappers/articleMapper.js'
import * as articleRepository from '../repositories/articleRepository.js'
import * as engagementRepository from '../repositories/engagementRepository.js'
import * as memberRepository from '../repositories/memberRepository.js'

async function ensureArticle(articleId) {
  const article = await articleRepository.findArticleById(articleId, 'published')
  if (!article) throw new HttpError(404, 'Article not found.')
  return article
}

export async function addComment(articleId, user, text, replyToCommentId) {
  await ensureArticle(articleId)
  if (replyToCommentId !== undefined && replyToCommentId !== null) {
    const parent = await engagementRepository.findComment(replyToCommentId)
    if (!parent || parent.article_id !== articleId || parent.reply_to_comment_id !== null) {
      throw new HttpError(404, 'Comment not found or cannot be replied to.')
    }
  }
  const profile = await memberRepository.findMemberProfile(user.id)
  const row = await engagementRepository.insertComment({
    article_id: articleId,
    member_id: user.id,
    reply_to_comment_id: replyToCommentId ?? null,
    author: profile?.name ?? user.user_metadata?.name ?? 'Member',
    avatar: profile?.avatar_url ?? user.user_metadata?.avatar ?? '',
    text: text.trim(),
  })
  return toComment(row)
}

export async function removeComment(articleId, commentId, userId) {
  const deleted = await engagementRepository.deleteComment(articleId, commentId, userId)
  if (!deleted) throw new HttpError(404, 'Comment not found or cannot be deleted.')
}

export async function toggleLike(articleId, userId) {
  await ensureArticle(articleId)
  const existing = await engagementRepository.findLike(articleId, userId)
  if (existing) await engagementRepository.deleteLike(articleId, userId)
  else await engagementRepository.insertLike(articleId, userId)

  const likes = await engagementRepository.getArticleLikeCount(articleId)
  return { liked: !existing, likes }
}

export async function toggleCommentLike(articleId, commentId, userId) {
  await ensureArticle(articleId)
  const comment = await engagementRepository.findComment(commentId)
  if (!comment || comment.article_id !== articleId) throw new HttpError(404, 'Comment not found.')
  const existing = await engagementRepository.findCommentLike(commentId, userId)
  if (existing) await engagementRepository.deleteCommentLike(commentId, userId)
  else await engagementRepository.insertCommentLike(commentId, userId)
  const likes = await engagementRepository.getCommentLikeCount(commentId)
  return { liked: !existing, likes }
}

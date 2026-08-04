import { HttpError } from '../errors/HttpError.js'
import { toComment } from '../mappers/articleMapper.js'
import * as articleRepository from '../repositories/articleRepository.js'
import * as engagementRepository from '../repositories/engagementRepository.js'
import * as memberRepository from '../repositories/memberRepository.js'

async function ensureArticle(articleId) {
  const article = await articleRepository.findArticleById(articleId)
  if (!article) throw new HttpError(404, 'Article not found.')
  return article
}

export async function addComment(articleId, user, text) {
  await ensureArticle(articleId)
  const profile = await memberRepository.findMemberProfile(user.id)
  const row = await engagementRepository.insertComment({
    article_id: articleId,
    member_id: user.id,
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
  const article = await ensureArticle(articleId)
  const existing = await engagementRepository.findLike(articleId, userId)
  if (existing) await engagementRepository.deleteLike(articleId, userId)
  else await engagementRepository.insertLike(articleId, userId)

  const likes = Math.max(0, (article.likes ?? 0) + (existing ? -1 : 1))
  await engagementRepository.syncArticleLikeCount(articleId, likes)
  return { liked: !existing, likes }
}

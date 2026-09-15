import { HttpError } from '../errors/HttpError.js'
import { toArticle, toArticleInsert, toArticleUpdate } from '../mappers/articleMapper.js'
import * as articleRepository from '../repositories/articleRepository.js'
import * as categoryRepository from '../repositories/categoryRepository.js'
import * as memberRepository from '../repositories/memberRepository.js'
import { deleteImage, signImagePaths } from './uploadService.js'

async function toArticles(rows) {
  const paths = rows.flatMap((row) => [
    row.image_url,
    row.author_avatar,
    ...(row.comments ?? []).map((comment) => comment.avatar),
  ])
  const signedUrls = await signImagePaths(paths)
  return rows.map((row) => toArticle(row, signedUrls))
}

async function authorFrom(user, input) {
  if (!user) {
    if (!Object.prototype.hasOwnProperty.call(input, 'author')) return {}
    return { author: String(input.author).trim() }
  }

  const profile = await memberRepository.findMemberProfile(user.id)
  return {
    author_id: user.id,
    author: profile?.name
      || user.user_metadata?.name
      || profile?.username
      || user.user_metadata?.username
      || user.email
      || 'Administrator',
    author_avatar: profile?.avatar_url || user.user_metadata?.avatar || null,
  }
}

export async function listArticles(filters, canReadDrafts = false) {
  if (!canReadDrafts && filters.status === 'draft') {
    throw new HttpError(403, 'Administrator access is required to read drafts.')
  }
  const page = filters.page === undefined ? undefined : Number(filters.page)
  const limit = filters.limit === undefined ? undefined : Number(filters.limit)
  let categoryId
  if (filters.categoryId !== undefined) {
    categoryId = Number(filters.categoryId)
  } else if (filters.category) {
    const category = await categoryRepository.findCategoryByName(filters.category)
    if (!category) {
      return {
        articles: [],
        ...(limit ? { pagination: { page, limit, total: 0, hasMore: false } } : {}),
      }
    }
    categoryId = category.id
  }
  const { rows, total } = await articleRepository.findArticles({
    ...filters,
    status: canReadDrafts ? filters.status : 'published',
    categoryId,
    page,
    limit,
  })
  return {
    articles: await toArticles(rows),
    ...(limit ? {
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    } : {}),
  }
}

export async function getArticle(id, canReadDrafts = false) {
  const row = await articleRepository.findArticleById(id, canReadDrafts ? undefined : 'published')
  if (!row) throw new HttpError(404, 'Article not found.')
  return (await toArticles([row]))[0]
}

export async function createArticle(input, user) {
  const category = input.categoryId !== undefined
    ? await categoryRepository.findCategoryById(Number(input.categoryId))
    : await categoryRepository.findCategoryByName(input.category)
  if (!category) throw new HttpError(400, 'Category not found.')
  const article = {
    ...toArticleInsert({ ...input, categoryId: category.id }),
    ...await authorFrom(user, input),
  }
  const row = await articleRepository.insertArticle(article)
  return (await toArticles([row]))[0]
}

export async function updateArticle(id, input, user) {
  const hasImage = Object.prototype.hasOwnProperty.call(input, 'image')
    || Object.prototype.hasOwnProperty.call(input, 'image_url')
  const existing = hasImage ? await articleRepository.findArticleById(id) : null
  let mappedInput = input
  if (input.categoryId !== undefined || input.category !== undefined) {
    const category = input.categoryId !== undefined
      ? await categoryRepository.findCategoryById(Number(input.categoryId))
      : await categoryRepository.findCategoryByName(input.category)
    if (!category) throw new HttpError(400, 'Category not found.')
    mappedInput = { ...input, categoryId: category.id }
  }
  const update = { ...toArticleUpdate(mappedInput), ...await authorFrom(user, input) }
  if (Object.keys(update).length === 0) {
    throw new HttpError(400, 'At least one article field is required.')
  }

  const row = await articleRepository.updateArticleById(id, update)
  if (!row) throw new HttpError(404, 'Article not found.')
  if (existing?.image_url && existing.image_url !== row.image_url) {
    await deleteImage(existing.image_url).catch((error) => console.error('Unable to remove old article image.', error))
  }
  return (await toArticles([row]))[0]
}

export async function deleteArticle(id) {
  const existing = await articleRepository.findArticleById(id)
  if (!existing) throw new HttpError(404, 'Article not found.')
  const row = await articleRepository.deleteArticleById(id)
  if (!row) throw new HttpError(404, 'Article not found.')
  await deleteImage(existing.image_url).catch((error) => console.error('Unable to remove article image.', error))
}

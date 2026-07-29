import { HttpError } from '../errors/HttpError.js'
import { toArticle, toArticleInsert, toArticleUpdate } from '../mappers/articleMapper.js'
import * as articleRepository from '../repositories/articleRepository.js'

export async function listArticles(filters) {
  const rows = await articleRepository.findArticles(filters)
  return rows.map(toArticle)
}

export async function getArticle(id) {
  const row = await articleRepository.findArticleById(id)
  if (!row) throw new HttpError(404, 'Article not found.')
  return toArticle(row)
}

export async function createArticle(input) {
  const row = await articleRepository.insertArticle(toArticleInsert(input))
  return toArticle(row)
}

export async function updateArticle(id, input) {
  const update = toArticleUpdate(input)
  if (Object.keys(update).length === 0) {
    throw new HttpError(400, 'At least one article field is required.')
  }

  const row = await articleRepository.updateArticleById(id, update)
  if (!row) throw new HttpError(404, 'Article not found.')
  return toArticle(row)
}

export async function deleteArticle(id) {
  const row = await articleRepository.deleteArticleById(id)
  if (!row) throw new HttpError(404, 'Article not found.')
}

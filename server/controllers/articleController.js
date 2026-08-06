import * as articleService from '../services/articleService.js'

export async function list(req, res) {
  res.json(await articleService.listArticles(req.query))
}

export async function getById(req, res) {
  const article = await articleService.getArticle(Number(req.params.id))
  res.json({ article })
}

export async function create(req, res) {
  const article = await articleService.createArticle(req.body, req.user)
  res.status(201).json({ article })
}

export async function update(req, res) {
  const article = await articleService.updateArticle(Number(req.params.id), req.body, req.user)
  res.json({ article })
}

export async function remove(req, res) {
  await articleService.deleteArticle(Number(req.params.id))
  res.status(204).send()
}

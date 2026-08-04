import * as categoryService from '../services/categoryService.js'

export async function list(req, res) {
  const categories = await categoryService.listCategories(req.query.search)
  res.json({ categories })
}

export async function create(req, res) {
  const category = await categoryService.createCategory(req.body)
  res.status(201).json({ category })
}

export async function update(req, res) {
  const category = await categoryService.updateCategory(Number(req.params.id), req.body)
  res.json({ category })
}

export async function remove(req, res) {
  await categoryService.deleteCategory(Number(req.params.id))
  res.status(204).send()
}

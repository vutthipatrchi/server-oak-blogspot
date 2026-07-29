import { HttpError } from '../errors/HttpError.js'
import * as categoryRepository from '../repositories/categoryRepository.js'

export function listCategories(search) {
  return categoryRepository.findCategories(search)
}

export function createCategory(input) {
  return categoryRepository.insertCategory({
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
  })
}

export async function updateCategory(id, input) {
  const existing = await categoryRepository.findCategoryById(id)
  if (!existing) throw new HttpError(404, 'Category not found.')

  const category = await categoryRepository.updateCategoryById(id, {
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
  })
  if (!category) throw new HttpError(404, 'Category not found.')
  return category
}

export async function deleteCategory(id) {
  const category = await categoryRepository.deleteCategoryById(id)
  if (!category) throw new HttpError(404, 'Category not found.')
}

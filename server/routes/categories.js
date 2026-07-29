import { Router } from 'express'
import * as categoryController from '../controllers/categoryController.js'
import { requireAdmin, requireSupabase } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'
import { validateCategory, validateIdParam } from '../middleware/validation.js'

export const categoriesRouter = Router()

categoriesRouter.use(requireSupabase)

categoriesRouter.get('/', asyncHandler(categoryController.list))
categoriesRouter.post(
  '/',
  requireAdmin,
  validateCategory,
  asyncHandler(categoryController.create),
)
categoriesRouter.patch(
  '/:id',
  requireAdmin,
  validateIdParam,
  validateCategory,
  asyncHandler(categoryController.update),
)
categoriesRouter.delete(
  '/:id',
  requireAdmin,
  validateIdParam,
  asyncHandler(categoryController.remove),
)

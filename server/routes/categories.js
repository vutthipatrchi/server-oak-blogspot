import { Router } from 'express'
import * as categoryController from '../controllers/categoryController.js'
import { requireAdmin, requireSupabase } from '../middleware/auth.js'
import { validateCategory, validateIdParam } from '../middleware/validation.js'

export const categoriesRouter = Router()

categoriesRouter.use(requireSupabase)

categoriesRouter.get('/', categoryController.list)
categoriesRouter.post(
  '/',
  requireAdmin,
  validateCategory,
  categoryController.create,
)
categoriesRouter.patch(
  '/:id',
  requireAdmin,
  validateIdParam,
  validateCategory,
  categoryController.update,
)
categoriesRouter.delete(
  '/:id',
  requireAdmin,
  validateIdParam,
  categoryController.remove,
)

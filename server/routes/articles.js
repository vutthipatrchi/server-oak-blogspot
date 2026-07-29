import { Router } from 'express'
import * as articleController from '../controllers/articleController.js'
import { requireAdmin, requireSupabase } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'
import {
  validateArticleFilters,
  validateCreateArticle,
  validateIdParam,
  validateUpdateArticle,
} from '../middleware/validation.js'

export const articlesRouter = Router()

articlesRouter.use(requireSupabase)

articlesRouter.get('/', validateArticleFilters, asyncHandler(articleController.list))
articlesRouter.get('/:id', validateIdParam, asyncHandler(articleController.getById))
articlesRouter.post(
  '/',
  requireAdmin,
  validateCreateArticle,
  asyncHandler(articleController.create),
)
articlesRouter.patch(
  '/:id',
  requireAdmin,
  validateIdParam,
  validateUpdateArticle,
  asyncHandler(articleController.update),
)
articlesRouter.delete(
  '/:id',
  requireAdmin,
  validateIdParam,
  asyncHandler(articleController.remove),
)

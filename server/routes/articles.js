import { Router } from 'express'
import * as articleController from '../controllers/articleController.js'
import { requireAdmin, requireSupabase } from '../middleware/auth.js'
import {
  validateArticleFilters,
  validateCreateArticle,
  validateIdParam,
  validateUpdateArticle,
} from '../middleware/validation.js'

export const articlesRouter = Router()

articlesRouter.use(requireSupabase)

articlesRouter.get('/', validateArticleFilters, articleController.list)
articlesRouter.get('/:id', validateIdParam, articleController.getById)
articlesRouter.post(
  '/',
  requireAdmin,
  validateCreateArticle,
  articleController.create,
)
articlesRouter.patch(
  '/:id',
  requireAdmin,
  validateIdParam,
  validateUpdateArticle,
  articleController.update,
)
articlesRouter.delete(
  '/:id',
  requireAdmin,
  validateIdParam,
  articleController.remove,
)

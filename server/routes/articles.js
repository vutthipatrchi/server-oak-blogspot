import { Router } from 'express'
import * as articleController from '../controllers/articleController.js'
import * as engagementController from '../controllers/engagementController.js'
import { requireAdmin, requireMember, requireSupabase } from '../middleware/auth.js'
import {
  validateArticleFilters,
  validateComment,
  validateCommentId,
  validateCreateArticle,
  validateIdParam,
  validateUpdateArticle,
} from '../middleware/validation.js'

export const articlesRouter = Router()

articlesRouter.use(requireSupabase)

articlesRouter.get('/', validateArticleFilters, articleController.list)
articlesRouter.get('/:id', validateIdParam, articleController.getById)
articlesRouter.post(
  '/:id/comments', requireMember, validateIdParam, validateComment, engagementController.addComment,
)
articlesRouter.delete(
  '/:id/comments/:commentId',
  requireMember,
  validateIdParam,
  validateCommentId,
  engagementController.removeComment,
)
articlesRouter.post(
  '/:id/like', requireMember, validateIdParam, engagementController.toggleLike,
)
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

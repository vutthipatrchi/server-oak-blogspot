import { Router } from 'express'
import * as systemController from '../controllers/systemController.js'
import { requireAdmin } from '../middleware/auth.js'
import { validatePasswordReset } from '../middleware/validation.js'

export const systemRouter = Router()

systemRouter.get('/health', systemController.health)
systemRouter.get('/notifications', systemController.notifications)
systemRouter.post(
  '/reset-password',
  requireAdmin,
  validatePasswordReset,
  systemController.resetPassword,
)

import { Router } from 'express'
import * as systemController from '../controllers/systemController.js'
import * as notificationController from '../controllers/notificationController.js'
import { requireMember } from '../middleware/auth.js'

export const systemRouter = Router()

systemRouter.get('/health', systemController.health)
systemRouter.get('/notifications', requireMember, notificationController.list)
systemRouter.patch('/notifications/read', requireMember, notificationController.markAllRead)

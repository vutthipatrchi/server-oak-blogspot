import { Router } from 'express'
import * as systemController from '../controllers/systemController.js'

export const systemRouter = Router()

systemRouter.get('/health', systemController.health)
systemRouter.get('/notifications', systemController.notifications)

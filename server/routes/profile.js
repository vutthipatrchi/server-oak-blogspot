import { Router } from 'express'
import * as profileController from '../controllers/profileController.js'
import { requireAdmin, requireSupabase } from '../middleware/auth.js'
import { validateProfile } from '../middleware/validation.js'

export const profileRouter = Router()

profileRouter.use(requireSupabase)

profileRouter.get('/', profileController.get)
profileRouter.put(
  '/',
  requireAdmin,
  validateProfile,
  profileController.update,
)

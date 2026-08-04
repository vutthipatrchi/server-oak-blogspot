import { Router } from 'express'
import * as profileController from '../controllers/profileController.js'
import { requireOwner, requireSupabase } from '../middleware/auth.js'
import { validateProfile } from '../middleware/validation.js'

export const profileRouter = Router()

profileRouter.use(requireSupabase)

profileRouter.get('/', profileController.get)
profileRouter.put(
  '/',
  requireOwner,
  validateProfile,
  profileController.update,
)

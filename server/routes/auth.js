import { Router } from 'express'
import * as authController from '../controllers/authController.js'
import { requireMember, requireSupabase } from '../middleware/auth.js'
import {
  validateMemberProfile,
  validatePasswordReset,
  validateSignIn,
  validateSignUp,
} from '../middleware/validation.js'

export const authRouter = Router()

authRouter.use(requireSupabase)
authRouter.post('/signup', validateSignUp, authController.signUp)
authRouter.post('/login', validateSignIn, authController.signIn)
authRouter.get('/me', requireMember, authController.me)
authRouter.patch('/profile', requireMember, validateMemberProfile, authController.updateProfile)
authRouter.post('/password', requireMember, validatePasswordReset, authController.updatePassword)

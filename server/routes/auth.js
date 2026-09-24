import { Router } from 'express'
import * as authController from '../controllers/authController.js'
import { requireMember, requireSupabase } from '../middleware/auth.js'
import { loginRateLimit, recoveryRateLimit, refreshRateLimit, signupRateLimit } from '../middleware/rateLimit.js'
import {
  validateMemberProfile,
  validatePasswordReset,
  validateRecoveryCompletion,
  validateRecoveryRequest,
  validateSignIn,
  validateSignUp,
} from '../middleware/validation.js'

export const authRouter = Router()

authRouter.use(requireSupabase)
authRouter.post('/signup', signupRateLimit, validateSignUp, authController.signUp)
authRouter.post('/login', loginRateLimit, validateSignIn, authController.signIn)
authRouter.post('/recover', recoveryRateLimit, validateRecoveryRequest, authController.requestPasswordRecovery)
authRouter.post('/recover/complete', recoveryRateLimit, validateRecoveryCompletion, authController.completePasswordRecovery)
authRouter.post('/refresh', refreshRateLimit, authController.refresh)
authRouter.post('/logout', requireMember, authController.signOut)
authRouter.get('/me', requireMember, authController.me)
authRouter.patch('/profile', requireMember, validateMemberProfile, authController.updateProfile)
authRouter.post('/password', requireMember, validatePasswordReset, authController.updatePassword)

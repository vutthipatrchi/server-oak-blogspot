import { Router, raw } from 'express'
import * as uploadController from '../controllers/uploadController.js'
import { requireAdmin, requireMember, requireSupabase } from '../middleware/auth.js'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export const uploadsRouter = Router()
const parseImage = raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: MAX_IMAGE_SIZE })

uploadsRouter.use(requireSupabase)
uploadsRouter.post(
  '/articles',
  requireAdmin,
  parseImage,
  uploadController.uploadImage,
)
uploadsRouter.post(
  '/profiles/members',
  requireMember,
  parseImage,
  uploadController.uploadMemberProfileImage,
)
uploadsRouter.post(
  '/profiles/admins',
  requireAdmin,
  parseImage,
  uploadController.uploadAdminProfileImage,
)

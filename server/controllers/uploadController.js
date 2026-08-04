import * as uploadService from '../services/uploadService.js'

export async function uploadImage(req, res) {
  const uploaded = await uploadService.uploadArticleImage(req.body, req.get('content-type'))
  res.status(201).json(uploaded)
}

export async function uploadMemberProfileImage(req, res) {
  const uploaded = await uploadService.uploadMemberProfileImage(
    req.body,
    req.get('content-type'),
    req.user.id,
  )
  res.status(201).json(uploaded)
}

export async function uploadAdminProfileImage(req, res) {
  const uploaded = await uploadService.uploadAdminProfileImage(
    req.body,
    req.get('content-type'),
    req.user?.id,
  )
  res.status(201).json(uploaded)
}

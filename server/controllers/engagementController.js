import * as engagementService from '../services/engagementService.js'

export async function addComment(req, res) {
  const comment = await engagementService.addComment(Number(req.params.id), req.user, req.body.text)
  res.status(201).json({ comment })
}

export async function removeComment(req, res) {
  await engagementService.removeComment(Number(req.params.id), Number(req.params.commentId), req.user.id)
  res.status(204).send()
}

export async function toggleLike(req, res) {
  res.json(await engagementService.toggleLike(Number(req.params.id), req.user.id))
}

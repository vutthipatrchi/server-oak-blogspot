import * as authService from '../services/authService.js'

export async function signUp(req, res) {
  res.status(201).json(await authService.signUp(req.body))
}

export async function signIn(req, res) {
  res.json(await authService.signIn(req.body))
}

export async function me(req, res) {
  res.json({ member: await authService.getSessionMember(req.user) })
}

export async function updateProfile(req, res) {
  res.json({ member: await authService.updateMember(req.user, req.body) })
}

export async function updatePassword(req, res) {
  await authService.updatePassword(req.user, req.body)
  res.json({ message: 'Password updated.' })
}

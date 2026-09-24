import * as authService from '../services/authService.js'
import { clearRefreshCookie, getRefreshToken, setRefreshCookie } from '../authCookie.js'

function sendAuthResponse(res, result, status = 200) {
  const { refreshToken, ...body } = result
  if (refreshToken) setRefreshCookie(res, refreshToken)
  res.status(status).json(body)
}

export async function signUp(req, res) {
  sendAuthResponse(res, await authService.signUp(req.body), 201)
}

export async function signIn(req, res) {
  sendAuthResponse(res, await authService.signIn(req.body))
}

export async function requestPasswordRecovery(req, res) {
  await authService.requestPasswordRecovery(req.body.email)
  res.json({ message: 'If an account exists for this email, a password reset link has been sent.' })
}

export async function completePasswordRecovery(req, res) {
  await authService.completePasswordRecovery(req.body.refreshToken, req.body.newPassword)
  res.json({ message: 'Password updated. You can now sign in.' })
}

export async function refresh(req, res) {
  sendAuthResponse(res, await authService.refreshSession(getRefreshToken(req)))
}

export async function signOut(req, res) {
  try {
    await authService.signOut(req.accessToken)
  } finally {
    clearRefreshCookie(res)
  }
  res.status(204).send()
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

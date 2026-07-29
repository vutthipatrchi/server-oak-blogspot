import * as profileService from '../services/profileService.js'

export async function get(_req, res) {
  const profile = await profileService.getAdminProfile()
  res.json({ profile })
}

export async function update(req, res) {
  const profile = await profileService.saveAdminProfile(req.body)
  res.json({ profile })
}

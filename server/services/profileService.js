import * as profileRepository from '../repositories/profileRepository.js'
import { deleteImage, signImagePath } from './uploadService.js'

const emptyProfile = { name: '', email: '', bio: '', avatar_url: '' }

export async function getAdminProfile() {
  const profile = (await profileRepository.findAdminProfile()) ?? emptyProfile
  return {
    ...profile,
    avatar_path: profile.avatar_url,
    avatar_url: await signImagePath(profile.avatar_url),
  }
}

export async function saveAdminProfile(user, input) {
  const existing = user
    ? await profileRepository.findProfileById(user.id)
    : await profileRepository.findAdminProfile()
  const profile = await profileRepository.upsertAdminProfile({
    ...existing,
    id: user?.id ?? existing?.id,
    name: input.name.trim(),
    email: input.email.trim(),
    bio: input.bio?.trim() ?? '',
    avatar_url: (input.avatar_path ?? input.avatar_url)?.trim() ?? '',
    role: existing?.role ?? 'owner',
  })
  if (existing?.avatar_url && existing.avatar_url !== profile.avatar_url) {
    await deleteImage(existing.avatar_url).catch((error) => console.error('Unable to remove old admin image.', error))
  }
  return {
    ...profile,
    avatar_path: profile.avatar_url,
    avatar_url: await signImagePath(profile.avatar_url),
  }
}

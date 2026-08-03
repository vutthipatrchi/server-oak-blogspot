import * as profileRepository from '../repositories/profileRepository.js'

const emptyProfile = { name: '', email: '', bio: '', avatar_url: '' }

export async function getAdminProfile() {
  return (await profileRepository.findAdminProfile()) ?? emptyProfile
}

export function saveAdminProfile(input) {
  return profileRepository.upsertAdminProfile({
    id: 1,
    name: input.name.trim(),
    email: input.email.trim(),
    bio: input.bio?.trim() ?? '',
    avatar_url: input.avatar_url?.trim() ?? '',
  })
}

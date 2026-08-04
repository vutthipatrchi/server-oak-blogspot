export const USER_ROLES = ['owner', 'admin', 'member']

export function configuredOwnerEmail() {
  return (process.env.OWNER_EMAIL ?? process.env.ADMIN_EMAIL)?.trim().toLowerCase()
}

export function canManageArticles(role) {
  return role === 'owner' || role === 'admin'
}

export function isOwner(role) {
  return role === 'owner'
}

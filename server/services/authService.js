import { HttpError } from '../errors/HttpError.js'
import * as memberRepository from '../repositories/memberRepository.js'
import { authClient, canWriteWithSupabase, supabase } from '../supabase.js'
import { deleteImage, signImagePath } from './uploadService.js'
import { canManageArticles, configuredOwnerEmail } from '../roles.js'

async function memberFrom(user, profile) {
  const avatarPath = profile?.avatar_url ?? user.user_metadata?.avatar ?? ''
  return {
    id: user.id,
    name: profile?.name ?? user.user_metadata?.name ?? '',
    username: profile?.username ?? user.user_metadata?.username ?? '',
    email: user.email ?? '',
    avatar: await signImagePath(avatarPath),
    avatarPath,
  }
}

function initialRole(user) {
  const metadataRole = user.app_metadata?.role
  if (metadataRole === 'owner' || metadataRole === 'admin') return metadataRole
  return user.email?.toLowerCase() === configuredOwnerEmail()
    ? 'owner'
    : 'member'
}

async function sessionResponse(user, session, profile) {
  const role = profile?.role ?? initialRole(user)

  return {
    member: await memberFrom(user, profile),
    session: {
      accessToken: session.access_token,
      expiresAt: session.expires_at ?? null,
      role,
    },
    refreshToken: session.refresh_token,
  }
}

async function ensureMemberProfile(user) {
  const existing = await memberRepository.findMemberProfile(user.id)
  if (existing) {
    const fallbackRole = initialRole(user)
    const role = existing.role === 'member' && fallbackRole !== 'member'
      ? fallbackRole
      : existing.role
    if (existing.email === user.email && existing.role === role) return existing
    return memberRepository.upsertMemberProfile({ ...existing, email: user.email, role })
  }
  if (!canWriteWithSupabase) {
    throw new HttpError(503, 'SUPABASE_SERVICE_ROLE_KEY is required for member profiles.')
  }
  return memberRepository.upsertMemberProfile({
    id: user.id,
    email: user.email,
    name: String(user.user_metadata?.name ?? '').trim() || 'Member',
    username: String(user.user_metadata?.username ?? '').trim().toLowerCase()
      || `${user.email?.split('@')[0] || 'user'}-${user.id.slice(0, 8)}`,
    bio: '',
    avatar_url: String(user.user_metadata?.avatar ?? '').trim(),
    role: initialRole(user),
  })
}

export async function signUp(input) {
  if (!supabase || !authClient) throw new HttpError(503, 'Supabase Auth is not configured.')
  const normalizedEmail = input.email.trim().toLowerCase()
  if (normalizedEmail === configuredOwnerEmail()) {
    throw new HttpError(403, 'This email is reserved for an administrator account.')
  }

  const { data: created, error: createError } = await authClient.auth.signUp({
    email: normalizedEmail,
    password: input.password,
    options: {
      data: { name: input.name.trim(), username: input.username.trim().toLowerCase() },
    },
  })
  if (createError) throw new HttpError(createError.status === 422 ? 409 : 400, createError.message)
  if (!created.user) throw new HttpError(400, 'Unable to create account.')

  if (!created.session) {
    // Email confirmation postpones the first authenticated request. Create the
    // profile now so username login can resolve the account after confirmation.
    // Supabase may return an obfuscated user for an existing email, so verify
    // the ID with the admin API before writing a profile.
    if (canWriteWithSupabase) {
      const { data: verified } = await supabase.auth.admin.getUserById(created.user.id)
      if (verified?.user?.email?.toLowerCase() === normalizedEmail) {
        await ensureMemberProfile(verified.user)
      }
    }
    return {
      member: await memberFrom(created.user),
      session: null,
      requiresEmailConfirmation: true,
    }
  }

  const profile = await ensureMemberProfile(created.user)
  return sessionResponse(created.user, created.session, profile)
}

export async function signIn(input) {
  if (!supabase || !authClient) throw new HttpError(503, 'Supabase Auth is not configured.')

  let email = input.identifier.trim().toLowerCase()
  if (!email.includes('@')) {
    const profile = await memberRepository.findMemberProfileByUsername(email)
    if (!profile) throw new HttpError(401, 'Email, username, or password is incorrect.')
    const { data, error } = await supabase.auth.admin.getUserById(profile.id)
    if (error || !data.user?.email) throw new HttpError(401, 'Email, username, or password is incorrect.')
    email = data.user.email
  }

  const { data, error } = await authClient.auth.signInWithPassword({ email, password: input.password })
  if (error || !data.user || !data.session) {
    throw new HttpError(401, 'Email, username, or password is incorrect.')
  }

  const profile = await ensureMemberProfile(data.user)
  const response = await sessionResponse(data.user, data.session, profile)
  if (input.audience === 'admin' && !canManageArticles(response.session.role)) {
    throw new HttpError(403, 'Administrator access is required.')
  }
  return response
}

export async function requestPasswordRecovery(email) {
  if (!authClient) throw new HttpError(503, 'Supabase Auth is not configured.')
  const clientOrigin = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173').replace(/\/$/, '')
  const { error } = await authClient.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${clientOrigin}/?auth=reset-password`,
  })
  if (error) {
    throw error.status > 0
      ? new HttpError(error.status, error.message)
      : new HttpError(503, 'Authentication provider is unavailable.')
  }
}

export async function completePasswordRecovery(refreshToken, newPassword) {
  if (!authClient || !canWriteWithSupabase) {
    throw new HttpError(503, 'Password recovery is not configured.')
  }
  const { data, error } = await authClient.auth.refreshSession({ refresh_token: refreshToken })
  if (error || !data.user || !data.session) {
    throw new HttpError(401, 'Password recovery link is invalid or expired.')
  }
  const { error: updateError } = await supabase.auth.admin.updateUserById(data.user.id, {
    password: newPassword,
  })
  if (updateError) throw new HttpError(updateError.status ?? 400, updateError.message)
}

export async function refreshSession(refreshToken) {
  if (!authClient) throw new HttpError(503, 'Supabase Auth is not configured.')
  if (!refreshToken) throw new HttpError(401, 'Refresh session is missing or expired.')

  const { data, error } = await authClient.auth.refreshSession({ refresh_token: refreshToken })
  if (error || !data.user || !data.session) {
    throw new HttpError(401, 'Refresh session is invalid or expired.')
  }
  const profile = await ensureMemberProfile(data.user)
  return sessionResponse(data.user, data.session, profile)
}

export async function signOut(accessToken) {
  if (!supabase) throw new HttpError(503, 'Supabase Auth is not configured.')
  if (!canWriteWithSupabase) {
    throw new HttpError(503, 'SUPABASE_SERVICE_ROLE_KEY is required to revoke sessions.')
  }
  const { error } = await supabase.auth.admin.signOut(accessToken, 'global')
  if (error) throw new HttpError(400, 'Unable to revoke session.')
}

export async function getSessionMember(user) {
  return memberFrom(user, await memberRepository.findMemberProfile(user.id))
}

export async function updateMember(user, input) {
  const existing = await memberRepository.findMemberProfile(user.id)
  const profile = await memberRepository.upsertMemberProfile({
    ...existing,
    id: user.id,
    email: user.email,
    name: input.name.trim(),
    username: input.username.trim().toLowerCase(),
    avatar_url: input.avatar?.trim() ?? '',
    role: existing?.role ?? initialRole(user),
  })
  if (existing?.avatar_url && existing.avatar_url !== profile.avatar_url) {
    await deleteImage(existing.avatar_url).catch((error) => console.error('Unable to remove old member image.', error))
  }
  return memberFrom(user, profile)
}

export async function updatePassword(user, input) {
  const { error: verifyError } = await authClient.auth.signInWithPassword({
    email: user.email,
    password: input.currentPassword,
  })
  if (verifyError) throw new HttpError(401, 'Current password is incorrect.')

  const { error } = await supabase.auth.admin.updateUserById(user.id, { password: input.newPassword })
  if (error) throw new HttpError(400, error.message)
}

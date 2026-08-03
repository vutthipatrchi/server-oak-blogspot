import { HttpError } from '../errors/HttpError.js'
import * as memberRepository from '../repositories/memberRepository.js'
import { authClient, supabase } from '../supabase.js'

function memberFrom(user, profile) {
  return {
    id: user.id,
    name: profile?.name ?? user.user_metadata?.name ?? '',
    username: profile?.username ?? user.user_metadata?.username ?? '',
    email: user.email ?? '',
    avatar: profile?.avatar_url ?? user.user_metadata?.avatar ?? '',
  }
}

function sessionResponse(user, session, profile) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const role = user.app_metadata?.role === 'admin'
    || (adminEmail && user.email?.toLowerCase() === adminEmail)
    ? 'admin'
    : 'member'

  return {
    member: memberFrom(user, profile),
    session: {
      accessToken: session.access_token,
      expiresAt: session.expires_at ?? null,
      role,
    },
  }
}

export async function signUp(input) {
  if (!supabase || !authClient) throw new HttpError(503, 'Supabase Auth is not configured.')

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name.trim(), username: input.username.trim() },
  })
  if (createError) throw new HttpError(createError.status === 422 ? 409 : 400, createError.message)

  try {
    await memberRepository.upsertMemberProfile({
      id: created.user.id,
      name: input.name.trim(),
      username: input.username.trim().toLowerCase(),
      avatar_url: input.avatar?.trim() ?? '',
    })
  } catch (error) {
    await supabase.auth.admin.deleteUser(created.user.id)
    throw error
  }

  return signIn({ identifier: input.email, password: input.password, audience: 'member' })
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

  const profile = await memberRepository.findMemberProfile(data.user.id)
  const response = sessionResponse(data.user, data.session, profile)
  if (input.audience === 'admin' && response.session.role !== 'admin') {
    throw new HttpError(403, 'Administrator access is required.')
  }
  return response
}

export async function getSessionMember(user) {
  return memberFrom(user, await memberRepository.findMemberProfile(user.id))
}

export async function updateMember(user, input) {
  const profile = await memberRepository.upsertMemberProfile({
    id: user.id,
    name: input.name.trim(),
    username: input.username.trim().toLowerCase(),
    avatar_url: input.avatar?.trim() ?? '',
  })
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

import assert from 'node:assert/strict'
import { test } from 'node:test'

process.env.SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'

const { supabase, authClient } = await import('../server/supabase.js')
const { signIn, signUp } = await import('../server/services/authService.js')

test('a signup awaiting email confirmation can later log in by username', async () => {
  const user = {
    id: '8ad7f2d8-2cde-453b-a7f8-e2e1db19f61a',
    email: 'member@example.com',
    user_metadata: { name: 'Member', username: 'member.name' },
    app_metadata: {},
  }
  let profile = null
  const original = {
    from: supabase.from,
    getUserById: supabase.auth.admin.getUserById,
    signUp: authClient.auth.signUp,
    signInWithPassword: authClient.auth.signInWithPassword,
  }

  try {
    supabase.from = () => ({
      select: () => ({
        eq: (field, value) => ({ maybeSingle: async () => ({
          data: profile?.[field] === value ? profile : null,
          error: null,
        }) }),
      }),
      upsert: (value) => ({
        select: () => ({ single: async () => {
          profile = value
          return { data: value, error: null }
        } }),
      }),
    })
    supabase.auth.admin.getUserById = async () => ({ data: { user }, error: null })
    authClient.auth.signUp = async () => ({ data: { user, session: null }, error: null })
    authClient.auth.signInWithPassword = async ({ email, password }) => {
      assert.equal(email, user.email)
      assert.equal(password, 'correct-password')
      return { data: { user, session: {
        access_token: 'token', refresh_token: 'refresh', expires_at: 123,
      } }, error: null }
    }

    const signup = await signUp({
      name: 'Member', username: 'Member.Name', email: user.email,
      password: 'correct-password',
    })
    assert.equal(signup.requiresEmailConfirmation, true)
    assert.equal(profile?.username, 'member.name')

    const login = await signIn({ identifier: 'Member.Name', password: 'correct-password' })
    assert.equal(login.member.id, user.id)
  } finally {
    supabase.from = original.from
    supabase.auth.admin.getUserById = original.getUserById
    authClient.auth.signUp = original.signUp
    authClient.auth.signInWithPassword = original.signInWithPassword
  }
})

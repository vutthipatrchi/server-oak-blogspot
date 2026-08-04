import assert from 'node:assert/strict'
import 'dotenv/config'
import axios from 'axios'

const { app } = await import('../server/app.js')
const { supabase } = await import('../server/supabase.js')

const server = await new Promise((resolve) => {
  const listener = app.listen(0, '127.0.0.1', () => resolve(listener))
})
const baseUrl = `http://127.0.0.1:${server.address().port}`
const suffix = Date.now()
const email = `release-smoke-${suffix}@example.com`
const username = `release-smoke-${suffix}`
const password = `Smoke-${suffix}!`
const newPassword = `${password}-updated`

let userId
let accessToken
let articleId
let commentId
let liked = false
const uploadedPaths = []
const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

const authConfig = () => ({ headers: { Authorization: `Bearer ${accessToken}` } })

try {
  const signup = await axios.post(`${baseUrl}/api/auth/signup`, {
    name: 'Release Smoke Test',
    username,
    email,
    password,
  })
  userId = signup.data.member.id
  assert.ok(userId)

  if (!signup.data.session) {
    const { error: confirmError } = await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
    })
    assert.ifError(confirmError)
  }

  const initialLogin = await axios.post(`${baseUrl}/api/auth/login`, {
    identifier: email,
    password,
    audience: 'member',
  })
  accessToken = initialLogin.data.session.accessToken
  assert.ok(accessToken)

  const refreshCookie = initialLogin.headers['set-cookie']?.[0]?.split(';')[0]
  assert.ok(refreshCookie, 'Login must set the HttpOnly refresh cookie.')
  const refreshed = await axios.post(`${baseUrl}/api/auth/refresh`, undefined, {
    headers: { Cookie: refreshCookie },
  })
  accessToken = refreshed.data.session.accessToken
  assert.ok(accessToken)

  const articleImage = await axios.post(`${baseUrl}/api/uploads/articles`, onePixelPng, {
    headers: {
      'Content-Type': 'image/png',
      'x-admin-api-key': process.env.ADMIN_API_KEY,
    },
  })
  uploadedPaths.push(articleImage.data.path)
  assert.match(articleImage.data.path, /^articles\/\d{4}\/\d{2}\/[\w-]+\.png$/)
  assert.ok(articleImage.data.url)

  const adminImage = await axios.post(`${baseUrl}/api/uploads/profiles/admins`, onePixelPng, {
    headers: {
      'Content-Type': 'image/png',
      'x-admin-api-key': process.env.ADMIN_API_KEY,
    },
  })
  uploadedPaths.push(adminImage.data.path)
  assert.match(adminImage.data.path, /^profiles\/admins\/primary\/[\w-]+\.png$/)
  assert.ok(adminImage.data.url)

  const memberImage = await axios.post(`${baseUrl}/api/uploads/profiles/members`, onePixelPng, {
    headers: { ...authConfig().headers, 'Content-Type': 'image/png' },
  })
  uploadedPaths.push(memberImage.data.path)
  assert.match(memberImage.data.path, new RegExp(`^profiles/members/${userId}/[\\w-]+\\.png$`))
  assert.ok(memberImage.data.url)

  const profile = await axios.patch(`${baseUrl}/api/auth/profile`, {
    ...signup.data.member,
    name: 'Release Smoke Test Updated',
    avatar: memberImage.data.path,
  }, authConfig())
  assert.equal(profile.data.member.name, 'Release Smoke Test Updated')
  assert.equal(profile.data.member.avatarPath, memberImage.data.path)
  assert.ok(profile.data.member.avatar)

  await axios.post(`${baseUrl}/api/auth/password`, {
    currentPassword: password,
    newPassword,
  }, authConfig())

  const login = await axios.post(`${baseUrl}/api/auth/login`, {
    identifier: email,
    password: newPassword,
    audience: 'member',
  })
  accessToken = login.data.session.accessToken

  const articles = await axios.get(`${baseUrl}/api/articles?status=published`)
  articleId = articles.data.articles?.[0]?.id
  assert.ok(articleId, 'A published article is required for the engagement smoke test.')

  const comment = await axios.post(`${baseUrl}/api/articles/${articleId}/comments`, {
    text: 'Temporary release smoke-test comment.',
  }, authConfig())
  commentId = comment.data.comment.id
  assert.ok(commentId)

  const like = await axios.post(`${baseUrl}/api/articles/${articleId}/like`, undefined, authConfig())
  liked = like.data.liked
  assert.equal(liked, true)

  const unlike = await axios.post(`${baseUrl}/api/articles/${articleId}/like`, undefined, authConfig())
  liked = unlike.data.liked
  assert.equal(liked, false)

  await axios.delete(`${baseUrl}/api/articles/${articleId}/comments/${commentId}`, authConfig())
  commentId = null

  await axios.post(`${baseUrl}/api/auth/logout`, undefined, authConfig())

  console.log('Release smoke test passed: private storage, auth, profile, password, articles, comments, and likes.')
} catch (error) {
  const detail = error.response?.data?.error ?? error.message ?? String(error)
  console.error(`Release smoke test failed: ${detail}`)
  process.exitCode = 1
} finally {
  if (liked && articleId && accessToken) {
    await axios.post(`${baseUrl}/api/articles/${articleId}/like`, undefined, authConfig()).catch(() => {})
  }
  if (commentId && articleId && accessToken) {
    await axios.delete(`${baseUrl}/api/articles/${articleId}/comments/${commentId}`, authConfig()).catch(() => {})
  }
  if (uploadedPaths.length) {
    await supabase.storage.from(process.env.SUPABASE_IMAGE_BUCKET ?? 'oakblog').remove(uploadedPaths).catch(() => {})
  }
  if (userId) await supabase.auth.admin.deleteUser(userId).catch(() => {})
  await new Promise((resolve) => server.close(resolve))
}

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

const authConfig = () => ({ headers: { Authorization: `Bearer ${accessToken}` } })

try {
  const signup = await axios.post(`${baseUrl}/api/auth/signup`, {
    name: 'Release Smoke Test',
    username,
    email,
    password,
  })
  userId = signup.data.member.id
  accessToken = signup.data.session.accessToken
  assert.ok(userId && accessToken)

  const profile = await axios.patch(`${baseUrl}/api/auth/profile`, {
    ...signup.data.member,
    name: 'Release Smoke Test Updated',
  }, authConfig())
  assert.equal(profile.data.member.name, 'Release Smoke Test Updated')

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

  console.log('Release smoke test passed: auth, profile, password, articles, comments, and likes.')
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
  if (userId) await supabase.auth.admin.deleteUser(userId).catch(() => {})
  await new Promise((resolve) => server.close(resolve))
}

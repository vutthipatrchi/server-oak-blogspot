import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import axios from 'axios'

process.env.SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.ADMIN_API_KEY = 'test-admin-key'

const { app } = await import('../server/app.js')

let server
let baseUrl

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`
      resolve()
    })
  })
})

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
  })
})

test('GET /health reports that the server is running', async () => {
  const response = await axios.get(`${baseUrl}/health`)
  assert.equal(response.status, 200)
  assert.deepEqual(response.data, { status: 'ok' })
})

test('GET / describes the API and its public endpoints', async () => {
  const response = await axios.get(baseUrl)
  assert.equal(response.status, 200)
  assert.deepEqual(response.data, {
    name: 'server-oak-blogspot',
    status: 'ok',
    endpoints: {
      health: '/health',
      apiHealth: '/api/health',
      articles: '/api/articles',
      auth: '/api/auth',
      categories: '/api/categories',
      profile: '/api/profile',
      notifications: '/api/notifications',
      resetPassword: '/api/reset-password',
    },
  })
})

test('article filters reject unsupported values', async () => {
  const response = await axios.get(`${baseUrl}/api/articles?status=invalid`, {
    validateStatus: () => true,
  })
  assert.equal(response.status, 400)
  assert.deepEqual(response.data, { error: 'status must be draft or published.' })
})

test('article IDs must be positive integers', async () => {
  const response = await axios.get(`${baseUrl}/api/articles/not-a-number`, {
    validateStatus: () => true,
  })
  assert.equal(response.status, 400)
  assert.deepEqual(response.data, { error: 'id must be a positive integer.' })
})

test('article creation validates required fields before database access', async () => {
  const response = await axios.post(`${baseUrl}/api/articles`, {}, {
    headers: {
      'x-admin-api-key': 'test-admin-key',
    },
    validateStatus: () => true,
  })
  assert.equal(response.status, 400)
  assert.deepEqual(response.data, {
    error: 'title, excerpt, and author are required.',
  })
})

test('article writes reject missing and incorrect admin credentials', async () => {
  const input = {
    title: 'Test article',
    excerpt: 'Test excerpt',
    author: 'Test author',
  }

  for (const headers of [{}, { 'x-admin-api-key': 'incorrect-key' }]) {
    const response = await axios.post(`${baseUrl}/api/articles`, input, {
      headers,
      validateStatus: () => true,
    })
    assert.equal(response.status, 401)
    assert.deepEqual(response.data, { error: 'Authentication is required.' })
  }
})

test('category and profile writes validate payloads before database access', async () => {
  const config = {
    headers: { 'x-admin-api-key': 'test-admin-key' },
    validateStatus: () => true,
  }
  const category = await axios.post(`${baseUrl}/api/categories`, {}, config)
  assert.equal(category.status, 400)
  assert.deepEqual(category.data, { error: 'name is required.' })

  const profile = await axios.put(`${baseUrl}/api/profile`, { name: 'Admin', email: 'invalid' }, config)
  assert.equal(profile.status, 400)
  assert.deepEqual(profile.data, { error: 'a valid email is required.' })
})

test('password reset validates the new password', async () => {
  const response = await axios.post(`${baseUrl}/api/reset-password`, {
    currentPassword: 'current-password',
    newPassword: 'short',
  }, {
    headers: { 'x-admin-api-key': 'test-admin-key' },
    validateStatus: () => true,
  })
  assert.equal(response.status, 400)
  assert.deepEqual(response.data, { error: 'newPassword must be at least 8 characters.' })
})

test('member authentication validates credentials and requires a session', async () => {
  const invalidSignup = await axios.post(`${baseUrl}/api/auth/signup`, {
    name: 'Member',
    username: 'member',
    email: 'invalid',
    password: 'short',
  }, { validateStatus: () => true })
  assert.equal(invalidSignup.status, 400)
  assert.deepEqual(invalidSignup.data, { error: 'a valid email is required.' })

  const invalidLogin = await axios.post(`${baseUrl}/api/auth/login`, {}, {
    validateStatus: () => true,
  })
  assert.equal(invalidLogin.status, 400)
  assert.deepEqual(invalidLogin.data, { error: 'identifier and password are required.' })

  const me = await axios.get(`${baseUrl}/api/auth/me`, { validateStatus: () => true })
  assert.equal(me.status, 401)
  assert.deepEqual(me.data, { error: 'Authentication is required.' })
})

test('article engagement endpoints require member authentication', async () => {
  const requests = [
    axios.post(`${baseUrl}/api/articles/1/comments`, { text: 'Hello' }, { validateStatus: () => true }),
    axios.post(`${baseUrl}/api/articles/1/like`, undefined, { validateStatus: () => true }),
    axios.delete(`${baseUrl}/api/articles/1/comments/1`, { validateStatus: () => true }),
  ]
  const responses = await Promise.all(requests)
  for (const response of responses) {
    assert.equal(response.status, 401)
    assert.deepEqual(response.data, { error: 'Authentication is required.' })
  }
})

test('unknown routes return a JSON 404 response', async () => {
  const response = await axios.get(`${baseUrl}/unknown`, {
    validateStatus: () => true,
  })
  assert.equal(response.status, 404)
  assert.deepEqual(response.data, { error: 'Route not found.' })
})

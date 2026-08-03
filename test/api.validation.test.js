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

test('unknown routes return a JSON 404 response', async () => {
  const response = await axios.get(`${baseUrl}/unknown`, {
    validateStatus: () => true,
  })
  assert.equal(response.status, 404)
  assert.deepEqual(response.data, { error: 'Route not found.' })
})

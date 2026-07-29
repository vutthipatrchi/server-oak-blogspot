import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

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
  const response = await fetch(`${baseUrl}/health`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { status: 'ok' })
})

test('article filters reject unsupported values', async () => {
  const response = await fetch(`${baseUrl}/api/articles?status=invalid`)
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: 'status must be draft or published.' })
})

test('article IDs must be positive integers', async () => {
  const response = await fetch(`${baseUrl}/api/articles/not-a-number`)
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: 'id must be a positive integer.' })
})

test('article creation validates required fields before database access', async () => {
  const response = await fetch(`${baseUrl}/api/articles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-api-key': 'test-admin-key',
    },
    body: JSON.stringify({}),
  })
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), {
    error: 'title, excerpt, and author are required.',
  })
})

test('unknown routes return a JSON 404 response', async () => {
  const response = await fetch(`${baseUrl}/unknown`)
  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), { error: 'Route not found.' })
})

import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

process.env.SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.ADMIN_API_KEY = 'test-admin-key'
process.env.OWNER_EMAIL = 'owner@example.com'

const { supabase, authClient } = await import('../server/supabase.js')
const { app } = await import('../server/app.js')
const rows = [
  { id: 1, title: 'Private draft', status: 'draft', sections: [], comments: [] },
  { id: 2, title: 'Public article', status: 'published', sections: [], comments: [] },
]
const users = {
  member: { id: 'member', email: 'member@example.com', user_metadata: { role: 'owner' } },
  admin: { id: 'admin', email: 'admin@example.com' },
  owner: { id: 'owner', email: 'another-owner@example.com' },
  configuredOwner: { id: 'configuredOwner', email: 'owner@example.com' },
  metadataAdmin: { id: 'metadataAdmin', email: 'metadata@example.com', app_metadata: { role: 'admin' } },
}
authClient.auth.getUser = async (token) => ({
  data: { user: users[token] ?? null },
  error: users[token] ? null : new Error('Invalid token'),
})
// Exercise real routes, middleware, services, and repository filters without a live database.
supabase.from = (table) => {
  const filters = []
  let single = false
  let range
  const query = {
    select() { return this },
    order() { return this },
    eq(key, value) { filters.push([key, value]); return this },
    range(from, to) { range = [from, to]; return this },
    maybeSingle() { single = true; return this },
    then(resolve, reject) {
      return Promise.resolve().then(() => {
        assert.ok(['articles', 'profiles'].includes(table), 'Draft engagement must stop before any write')
        const source = table === 'articles' ? rows : Object.keys(users).map(id => ({
          id, role: id === 'admin' || id === 'owner' ? id : 'member',
        }))
        let data = source.filter(row => filters.every(([key, value]) => row[key] === value))
        const count = data.length
        if (range) data = data.slice(range[0], range[1] + 1)
        return { data: single ? data[0] ?? null : data, error: null, count }
      }).then(resolve, reject)
    },
  }
  return query
}
let server
let base
before(async () => {
  await new Promise(resolve => {
    server = app.listen(0, '127.0.0.1', () => {
      base = 'http://127.0.0.1:' + server.address().port
      resolve()
    })
  })
})
after(async () => { await new Promise(resolve => server.close(resolve)) })
async function request(path, headers = {}, method = 'GET') {
  const response = await fetch(base + '/api/articles' + path, {
    headers: { ...headers, ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
    method,
    ...(method === 'POST' && path.endsWith('/comments') ? { body: JSON.stringify({ text: 'Hello' }) } : {}),
  })
  return { status: response.status, body: await response.json(), headers: response.headers }
}
test('anonymous and member lists exclude drafts before pagination and counting', async () => {
  for (const headers of [{}, { Authorization: 'Bearer member' }]) {
    for (const suffix of ['', '?page=1&limit=1', '?status=published']) {
      const result = await request(suffix, headers)
      assert.equal(result.status, 200)
      assert.deepEqual(result.body.articles.map(row => row.id), [2])
      if (result.body.pagination) assert.equal(result.body.pagination.total, 1)
    }
  }
})
test('draft filter and detail are blocked even with forged flags or user metadata', async () => {
  for (const headers of [{}, { Authorization: 'Bearer member' }, { 'x-admin-api-key': 'wrong' }]) {
    assert.equal((await request('?status=draft&canReadDrafts=true', headers)).status, 403)
    assert.equal((await request('/1?canReadDrafts=true', headers)).status, 404)
    assert.equal((await request('/2', headers)).status, 200)
  }
})
test('verified administrators and owners retain draft list and detail access', async () => {
  for (const headers of [
    { Authorization: 'Bearer admin' }, { Authorization: 'Bearer owner' },
    { Authorization: 'Bearer configuredOwner' }, { Authorization: 'Bearer metadataAdmin' },
    { 'x-admin-api-key': 'test-admin-key' },
  ]) {
    const all = await request('', headers)
    assert.equal(all.status, 200)
    assert.equal(all.body.articles.length, 2)
    const drafts = await request('?status=draft&page=1&limit=1', headers)
    assert.deepEqual(drafts.body.articles.map(row => row.id), [1])
    assert.equal(drafts.body.pagination.total, 1)
    const detail = await request('/1', headers)
    assert.equal(detail.status, 200)
    assert.equal(detail.body.article.status, 'draft')
    assert.equal(detail.headers.get('cache-control'), 'private, no-store')
    assert.deepEqual((await request('?status=published', headers)).body.articles.map(row => row.id), [2])
  }
})
test('invalid bearer credentials cannot read drafts', async () => {
  for (const path of ['', '/1', '?status=draft']) {
    assert.equal((await request(path, { Authorization: 'Bearer invalid' })).status, 401)
  }
})
test('members cannot use comments or likes to access drafts', async () => {
  for (const path of ['/1/comments', '/1/like']) {
    const result = await request(path, { Authorization: 'Bearer member' }, 'POST')
    assert.equal(result.status, 404)
  }
})

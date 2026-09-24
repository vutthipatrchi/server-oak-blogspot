import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import axios from 'axios'

process.env.SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.ADMIN_API_KEY = 'test-admin-key'
process.env.ADMIN_EMAIL = 'admin@example.com'

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
    },
  })
})

test('article filters reject unsupported values', async () => {
  const response = await axios.get(`${baseUrl}/api/articles?status=invalid`, {
    validateStatus: () => true,
  })
  assert.equal(response.status, 400)
  assert.deepEqual(response.data, { error: 'status must be draft or published.' })

  const invalidCategoryId = await axios.get(`${baseUrl}/api/articles?categoryId=0`, {
    validateStatus: () => true,
  })
  assert.equal(invalidCategoryId.status, 400)
  assert.deepEqual(invalidCategoryId.data, { error: 'categoryId must be a positive integer.' })

  const invalidPage = await axios.get(`${baseUrl}/api/articles?page=0&limit=6`, {
    validateStatus: () => true,
  })
  assert.equal(invalidPage.status, 400)
  assert.deepEqual(invalidPage.data, { error: 'page must be a positive integer.' })

  const invalidLimit = await axios.get(`${baseUrl}/api/articles?page=1&limit=101`, {
    validateStatus: () => true,
  })
  assert.equal(invalidLimit.status, 400)
  assert.deepEqual(invalidLimit.data, { error: 'limit must be an integer between 1 and 100.' })

  const incompletePagination = await axios.get(`${baseUrl}/api/articles?limit=6`, {
    validateStatus: () => true,
  })
  assert.equal(incompletePagination.status, 400)
  assert.deepEqual(incompletePagination.data, { error: 'page and limit must be used together.' })
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

  const invalidImage = await axios.post(`${baseUrl}/api/articles`, {
    title: 'Article',
    excerpt: 'Excerpt',
    author: 'Admin',
    image: 'profiles/members/member-id/avatar.png',
  }, {
    headers: { 'x-admin-api-key': 'test-admin-key' },
    validateStatus: () => true,
  })
  assert.equal(invalidImage.status, 400)
  assert.deepEqual(invalidImage.data, { error: 'image must be a valid storage path.' })

  const invalidCategoryId = await axios.post(`${baseUrl}/api/articles`, {
    title: 'Article',
    excerpt: 'Excerpt',
    author: 'Admin',
    categoryId: 0,
  }, {
    headers: { 'x-admin-api-key': 'test-admin-key' },
    validateStatus: () => true,
  })
  assert.equal(invalidCategoryId.status, 400)
  assert.deepEqual(invalidCategoryId.data, { error: 'categoryId must be a positive integer.' })
})

test('article writes validate structured content and tags before database access', async () => {
  const config = {
    headers: { 'x-admin-api-key': 'test-admin-key' },
    validateStatus: () => true,
  }
  const baseArticle = {
    title: 'Article',
    excerpt: 'Excerpt',
    author: 'Admin',
    categoryId: 1,
  }

  const emptyContent = await axios.post(`${baseUrl}/api/articles`, {
    ...baseArticle,
    sections: [],
  }, config)
  assert.equal(emptyContent.status, 400)
  assert.deepEqual(emptyContent.data, { error: 'article content is required.' })

  const tooManyTags = await axios.post(`${baseUrl}/api/articles`, {
    ...baseArticle,
    tags: Array.from({ length: 11 }, (_value, index) => `tag-${index}`),
    sections: [{ title: '', paragraphs: ['Content'] }],
  }, config)
  assert.equal(tooManyTags.status, 400)
  assert.deepEqual(tooManyTags.data, { error: 'tags must not contain more than 10 items.' })

  const incompleteBullet = await axios.patch(`${baseUrl}/api/articles/1`, {
    sections: [{
      title: 'List',
      paragraphs: [],
      bullets: [{ term: 'Term', description: '' }],
    }],
  }, config)
  assert.equal(incompleteBullet.status, 400)
  assert.deepEqual(incompleteBullet.data, { error: 'each bullet must include a term and description.' })
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

test('image uploads require admin access and validate the content type', async () => {
  const unauthorized = await axios.post(
    `${baseUrl}/api/uploads/articles`,
    Buffer.from('image'),
    { headers: { 'Content-Type': 'image/png' }, validateStatus: () => true },
  )
  assert.equal(unauthorized.status, 401)

  const unsupported = await axios.post(
    `${baseUrl}/api/uploads/articles`,
    Buffer.from('file'),
    {
      headers: {
        'Content-Type': 'text/plain',
        'x-admin-api-key': 'test-admin-key',
      },
      validateStatus: () => true,
    },
  )
  assert.equal(unsupported.status, 415)
  assert.deepEqual(unsupported.data, {
    error: 'Only JPEG, PNG, and WebP images are supported.',
  })

  const mismatched = await axios.post(
    `${baseUrl}/api/uploads/articles`,
    Buffer.from('not-a-real-png'),
    {
      headers: {
        'Content-Type': 'image/png',
        'x-admin-api-key': 'test-admin-key',
      },
      validateStatus: () => true,
    },
  )
  assert.equal(mismatched.status, 415)
  assert.deepEqual(mismatched.data, {
    error: 'The file content does not match the selected image type.',
  })

  const memberProfile = await axios.post(
    `${baseUrl}/api/uploads/profiles/members`,
    Buffer.from('image'),
    { headers: { 'Content-Type': 'image/png' }, validateStatus: () => true },
  )
  assert.equal(memberProfile.status, 401)
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

  const invalidAvatar = await axios.put(`${baseUrl}/api/profile`, {
    name: 'Admin',
    email: 'admin@example.com',
    avatar_path: 'profiles/members/member-id/avatar.png',
  }, config)
  assert.equal(invalidAvatar.status, 400)
  assert.deepEqual(invalidAvatar.data, {
    error: 'avatar must be an administrator profile image path.',
  })
})

test('member password change validates the new password', async () => {
  const response = await axios.post(`${baseUrl}/api/auth/password`, {
    currentPassword: 'current-password',
    newPassword: 'short',
  }, {
    validateStatus: () => true,
  })
  assert.equal(response.status, 401)
  assert.deepEqual(response.data, { error: 'Authentication is required.' })
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

  const reservedAdminSignup = await axios.post(`${baseUrl}/api/auth/signup`, {
    name: 'Admin',
    username: 'admin-signup',
    email: 'admin@example.com',
    password: 'valid-password',
  }, { validateStatus: () => true })
  assert.equal(reservedAdminSignup.status, 403)
  assert.deepEqual(reservedAdminSignup.data, {
    error: 'This email is reserved for an administrator account.',
  })

  const invalidLogin = await axios.post(`${baseUrl}/api/auth/login`, {}, {
    validateStatus: () => true,
  })
  assert.equal(invalidLogin.status, 400)
  assert.deepEqual(invalidLogin.data, { error: 'identifier and password are required.' })

  const me = await axios.get(`${baseUrl}/api/auth/me`, { validateStatus: () => true })
  assert.equal(me.status, 401)
  assert.deepEqual(me.data, { error: 'Authentication is required.' })

  const refresh = await axios.post(`${baseUrl}/api/auth/refresh`, undefined, {
    validateStatus: () => true,
  })
  assert.equal(refresh.status, 401)
  assert.deepEqual(refresh.data, { error: 'Refresh session is missing or expired.' })

  const logout = await axios.post(`${baseUrl}/api/auth/logout`, undefined, {
    validateStatus: () => true,
  })
  assert.equal(logout.status, 401)
  assert.deepEqual(logout.data, { error: 'Authentication is required.' })
})

test('password recovery validates email, token, and new password', async () => {
  const invalidEmail = await axios.post(`${baseUrl}/api/auth/recover`, { email: 'invalid' }, {
    validateStatus: () => true,
  })
  assert.equal(invalidEmail.status, 400)
  assert.deepEqual(invalidEmail.data, { error: 'a valid email is required.' })

  const missingToken = await axios.post(`${baseUrl}/api/auth/recover/complete`, {
    newPassword: 'valid-password',
  }, { validateStatus: () => true })
  assert.equal(missingToken.status, 400)
  assert.deepEqual(missingToken.data, { error: 'a password recovery token is required.' })

  const shortPassword = await axios.post(`${baseUrl}/api/auth/recover/complete`, {
    refreshToken: 'placeholder',
    newPassword: 'short',
  }, { validateStatus: () => true })
  assert.equal(shortPassword.status, 400)
  assert.deepEqual(shortPassword.data, { error: 'newPassword must be at least 8 characters.' })
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

test('login attempts are rate limited', async () => {
  let limitedResponse
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const response = await axios.post(`${baseUrl}/api/auth/login`, {}, {
      validateStatus: () => true,
    })
    if (response.status === 429) {
      limitedResponse = response
      break
    }
  }

  assert.ok(limitedResponse)
  assert.equal(limitedResponse.headers['retry-after'] !== undefined, true)
  assert.deepEqual(limitedResponse.data, {
    error: 'Too many login attempts. Please try again later.',
  })
})

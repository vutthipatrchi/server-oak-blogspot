import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  publicationUpdate,
  toArticleInsert,
  toArticleUpdate,
} from '../server/mappers/articleMapper.js'

test('editing a published article does not reset its publication date', () => {
  assert.deepEqual(toArticleUpdate({ status: 'published', title: 'Updated title' }), {
    status: 'published',
    title: 'Updated title',
  })
  assert.deepEqual(publicationUpdate('published', 'published', '2026-09-15T00:00:00.000Z'), {})
})

test('publication date changes only when article status changes', () => {
  const now = '2026-09-15T00:00:00.000Z'
  assert.deepEqual(publicationUpdate('draft', 'published', now), { published_at: now })
  assert.deepEqual(publicationUpdate('published', 'draft', now), { published_at: null })
})

test('article writes cannot set the database-managed like count', () => {
  assert.equal(toArticleInsert({ title: 'Article', likes: 500 }).likes, 0)
  assert.equal(Object.hasOwn(toArticleUpdate({ likes: 500 }), 'likes'), false)
})

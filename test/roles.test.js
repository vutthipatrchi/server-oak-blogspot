import assert from 'node:assert/strict'
import test from 'node:test'
import { canManageArticles, isOwner, USER_ROLES } from '../server/roles.js'

test('role permissions separate owners, administrators, and members', () => {
  assert.deepEqual(USER_ROLES, ['owner', 'admin', 'member'])
  assert.equal(canManageArticles('owner'), true)
  assert.equal(canManageArticles('admin'), true)
  assert.equal(canManageArticles('member'), false)
  assert.equal(canManageArticles(undefined), false)
  assert.equal(isOwner('owner'), true)
  assert.equal(isOwner('admin'), false)
})

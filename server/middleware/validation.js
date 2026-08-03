import { ARTICLE_CATEGORIES, ARTICLE_STATUSES } from '../mappers/articleMapper.js'

function badRequest(res, message) {
  return res.status(400).json({ error: message })
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export function validateIdParam(req, res, next) {
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id < 1) {
    return badRequest(res, 'id must be a positive integer.')
  }
  next()
}

export function validateArticleFilters(req, res, next) {
  if (req.query.status && !ARTICLE_STATUSES.includes(req.query.status)) {
    return badRequest(res, 'status must be draft or published.')
  }
  if (req.query.category && !ARTICLE_CATEGORIES.includes(req.query.category)) {
    return badRequest(res, 'category must be Thinker, Writer, or Literature.')
  }
  next()
}

export function validateCreateArticle(req, res, next) {
  const { title, excerpt, author, category, status } = req.body
  if (!isNonEmptyString(title) || !isNonEmptyString(excerpt) || !isNonEmptyString(author)) {
    return badRequest(res, 'title, excerpt, and author are required.')
  }
  if (category !== undefined && !ARTICLE_CATEGORIES.includes(category)) {
    return badRequest(res, 'category must be Thinker, Writer, or Literature.')
  }
  if (status !== undefined && !ARTICLE_STATUSES.includes(status)) {
    return badRequest(res, 'status must be draft or published.')
  }
  next()
}

export function validateUpdateArticle(req, res, next) {
  const { title, excerpt, author, category, status } = req.body
  if (title !== undefined && !isNonEmptyString(title)) return badRequest(res, 'title cannot be empty.')
  if (excerpt !== undefined && !isNonEmptyString(excerpt)) return badRequest(res, 'excerpt cannot be empty.')
  if (author !== undefined && !isNonEmptyString(author)) return badRequest(res, 'author cannot be empty.')
  if (category !== undefined && !ARTICLE_CATEGORIES.includes(category)) {
    return badRequest(res, 'category must be Thinker, Writer, or Literature.')
  }
  if (status !== undefined && !ARTICLE_STATUSES.includes(status)) {
    return badRequest(res, 'status must be draft or published.')
  }
  next()
}

export function validateCategory(req, res, next) {
  if (!isNonEmptyString(req.body.name)) return badRequest(res, 'name is required.')
  next()
}

export function validateProfile(req, res, next) {
  if (!isNonEmptyString(req.body.name)) return badRequest(res, 'name is required.')
  if (!isNonEmptyString(req.body.email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)) {
    return badRequest(res, 'a valid email is required.')
  }
  next()
}

export function validatePasswordReset(req, res, next) {
  if (!isNonEmptyString(req.body.currentPassword) || !isNonEmptyString(req.body.newPassword)) {
    return badRequest(res, 'currentPassword and newPassword are required.')
  }
  if (req.body.newPassword.length < 8) {
    return badRequest(res, 'newPassword must be at least 8 characters.')
  }
  next()
}

export function validateSignUp(req, res, next) {
  const { name, username, email, password } = req.body
  if (!isNonEmptyString(name) || !isNonEmptyString(username)) {
    return badRequest(res, 'name and username are required.')
  }
  if (!isNonEmptyString(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest(res, 'a valid email is required.')
  }
  if (!isNonEmptyString(password) || password.length < 8) {
    return badRequest(res, 'password must be at least 8 characters.')
  }
  next()
}

export function validateSignIn(req, res, next) {
  if (!isNonEmptyString(req.body.identifier) || !isNonEmptyString(req.body.password)) {
    return badRequest(res, 'identifier and password are required.')
  }
  if (req.body.audience !== undefined && !['member', 'admin'].includes(req.body.audience)) {
    return badRequest(res, 'audience must be member or admin.')
  }
  next()
}

export function validateMemberProfile(req, res, next) {
  if (!isNonEmptyString(req.body.name) || !isNonEmptyString(req.body.username)) {
    return badRequest(res, 'name and username are required.')
  }
  next()
}

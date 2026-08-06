import { ARTICLE_STATUSES } from '../mappers/articleMapper.js'
import { isManagedImagePath } from '../services/uploadService.js'

function badRequest(res, message) {
  return res.status(400).json({ error: message })
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isValidArticleImageReference(value) {
  return (isManagedImagePath(value) && value.startsWith('articles/'))
    || /^https:\/\//.test(value)
    || /^\/article-images\//.test(value)
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
  if (req.query.category !== undefined && !isNonEmptyString(req.query.category)) {
    return badRequest(res, 'category cannot be empty.')
  }
  if (req.query.categoryId !== undefined
    && (!Number.isSafeInteger(Number(req.query.categoryId)) || Number(req.query.categoryId) < 1)) {
    return badRequest(res, 'categoryId must be a positive integer.')
  }
  if (req.query.page !== undefined
    && (!Number.isSafeInteger(Number(req.query.page)) || Number(req.query.page) < 1)) {
    return badRequest(res, 'page must be a positive integer.')
  }
  if (req.query.limit !== undefined
    && (!Number.isSafeInteger(Number(req.query.limit))
      || Number(req.query.limit) < 1
      || Number(req.query.limit) > 100)) {
    return badRequest(res, 'limit must be an integer between 1 and 100.')
  }
  if ((req.query.page === undefined) !== (req.query.limit === undefined)) {
    return badRequest(res, 'page and limit must be used together.')
  }
  next()
}

export function validateCreateArticle(req, res, next) {
  const { title, excerpt, author, category, categoryId, status } = req.body
  if (!isNonEmptyString(title) || !isNonEmptyString(excerpt) || (!req.user && !isNonEmptyString(author))) {
    return badRequest(res, 'title, excerpt, and author are required.')
  }
  if (req.body.image && !isValidArticleImageReference(req.body.image)) {
    return badRequest(res, 'image must be a valid storage path.')
  }
  if (categoryId === undefined && !isNonEmptyString(category)) {
    return badRequest(res, 'categoryId is required.')
  }
  if (categoryId !== undefined
    && (!Number.isSafeInteger(Number(categoryId)) || Number(categoryId) < 1)) {
    return badRequest(res, 'categoryId must be a positive integer.')
  }
  if (status !== undefined && !ARTICLE_STATUSES.includes(status)) {
    return badRequest(res, 'status must be draft or published.')
  }
  next()
}

export function validateUpdateArticle(req, res, next) {
  const { title, excerpt, author, category, categoryId, status } = req.body
  if (title !== undefined && !isNonEmptyString(title)) return badRequest(res, 'title cannot be empty.')
  if (excerpt !== undefined && !isNonEmptyString(excerpt)) return badRequest(res, 'excerpt cannot be empty.')
  if (author !== undefined && !isNonEmptyString(author)) return badRequest(res, 'author cannot be empty.')
  if (category !== undefined && !isNonEmptyString(category)) {
    return badRequest(res, 'category cannot be empty.')
  }
  if (categoryId !== undefined
    && (!Number.isSafeInteger(Number(categoryId)) || Number(categoryId) < 1)) {
    return badRequest(res, 'categoryId must be a positive integer.')
  }
  if (status !== undefined && !ARTICLE_STATUSES.includes(status)) {
    return badRequest(res, 'status must be draft or published.')
  }
  if (req.body.image && !isValidArticleImageReference(req.body.image)) {
    return badRequest(res, 'image must be a valid storage path.')
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
  const avatarPath = req.body.avatar_path ?? req.body.avatar_url
  if (avatarPath
    && !(isManagedImagePath(avatarPath) && avatarPath.startsWith('profiles/admins/'))
    && !/^https:\/\//.test(avatarPath)) {
    return badRequest(res, 'avatar must be an administrator profile image path.')
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
  if (req.body.avatar
    && !(isManagedImagePath(req.body.avatar)
      && req.body.avatar.startsWith(`profiles/members/${req.user.id}/`))
    && !/^https:\/\//.test(req.body.avatar)) {
    return badRequest(res, 'avatar must belong to the authenticated member.')
  }
  next()
}

export function validateComment(req, res, next) {
  if (!isNonEmptyString(req.body.text)) return badRequest(res, 'comment text is required.')
  if (req.body.text.trim().length > 2000) {
    return badRequest(res, 'comment text must not exceed 2000 characters.')
  }
  next()
}

export function validateCommentId(req, res, next) {
  const commentId = Number(req.params.commentId)
  if (!Number.isSafeInteger(commentId) || commentId < 1) {
    return badRequest(res, 'commentId must be a positive integer.')
  }
  next()
}

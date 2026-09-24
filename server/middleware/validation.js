import { ARTICLE_STATUSES } from '../mappers/articleMapper.js'
import { isManagedImagePath } from '../services/uploadService.js'

const MAX_ARTICLE_TITLE_LENGTH = 200
const MAX_ARTICLE_EXCERPT_LENGTH = 120
const MAX_ARTICLE_TAGS = 10
const MAX_ARTICLE_TAG_LENGTH = 40
const MAX_ARTICLE_SECTIONS = 50
const MAX_SECTION_TITLE_LENGTH = 200
const MAX_SECTION_PARAGRAPHS = 200
const MAX_SECTION_PARAGRAPH_LENGTH = 10_000
const MAX_SECTION_BULLETS = 100
const MAX_BULLET_TERM_LENGTH = 200
const MAX_BULLET_DESCRIPTION_LENGTH = 5_000

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

function validateArticleTags(tags) {
  if (tags === undefined) return null
  if (!Array.isArray(tags)) return 'tags must be an array.'
  if (tags.length > MAX_ARTICLE_TAGS) return `tags must not contain more than ${MAX_ARTICLE_TAGS} items.`
  if (tags.some((tag) => !isNonEmptyString(tag) || tag.trim().length > MAX_ARTICLE_TAG_LENGTH)) {
    return `each tag must be non-empty and no longer than ${MAX_ARTICLE_TAG_LENGTH} characters.`
  }
  return null
}

function validateArticleSections(sections) {
  if (!Array.isArray(sections) || sections.length === 0) return 'article content is required.'
  if (sections.length > MAX_ARTICLE_SECTIONS) {
    return `sections must not contain more than ${MAX_ARTICLE_SECTIONS} items.`
  }

  let hasContent = false
  for (const section of sections) {
    if (!section || typeof section !== 'object' || Array.isArray(section)) {
      return 'each section must be an object.'
    }
    if (typeof section.title !== 'string' || section.title.length > MAX_SECTION_TITLE_LENGTH) {
      return `each section title must be a string no longer than ${MAX_SECTION_TITLE_LENGTH} characters.`
    }
    if (!Array.isArray(section.paragraphs) || section.paragraphs.length > MAX_SECTION_PARAGRAPHS) {
      return `each section must contain at most ${MAX_SECTION_PARAGRAPHS} paragraphs.`
    }
    if (section.paragraphs.some((paragraph) => typeof paragraph !== 'string'
      || paragraph.length > MAX_SECTION_PARAGRAPH_LENGTH)) {
      return `each paragraph must be a string no longer than ${MAX_SECTION_PARAGRAPH_LENGTH} characters.`
    }
    if (section.paragraphs.some((paragraph) => paragraph.trim())) hasContent = true

    if (section.bullets !== undefined) {
      if (!Array.isArray(section.bullets) || section.bullets.length > MAX_SECTION_BULLETS) {
        return `each section must contain at most ${MAX_SECTION_BULLETS} bullets.`
      }
      for (const bullet of section.bullets) {
        if (!bullet || typeof bullet !== 'object'
          || !isNonEmptyString(bullet.term)
          || !isNonEmptyString(bullet.description)) {
          return 'each bullet must include a term and description.'
        }
        if (bullet.term.trim().length > MAX_BULLET_TERM_LENGTH
          || bullet.description.trim().length > MAX_BULLET_DESCRIPTION_LENGTH) {
          return 'bullet term or description is too long.'
        }
        hasContent = true
      }
    }
  }
  return hasContent ? null : 'article content is required.'
}

function validateArticlePayload(body, requireSections) {
  if (body.title !== undefined && body.title.trim().length > MAX_ARTICLE_TITLE_LENGTH) {
    return `title must not exceed ${MAX_ARTICLE_TITLE_LENGTH} characters.`
  }
  if (body.excerpt !== undefined && body.excerpt.trim().length > MAX_ARTICLE_EXCERPT_LENGTH) {
    return `excerpt must not exceed ${MAX_ARTICLE_EXCERPT_LENGTH} characters.`
  }
  const tagsError = validateArticleTags(body.tags)
  if (tagsError) return tagsError
  if (requireSections || body.sections !== undefined) return validateArticleSections(body.sections)
  return null
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
  const payloadError = validateArticlePayload(req.body, true)
  if (payloadError) return badRequest(res, payloadError)
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
  const payloadError = validateArticlePayload(req.body, false)
  if (payloadError) return badRequest(res, payloadError)
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

export function validateRecoveryRequest(req, res, next) {
  if (!isNonEmptyString(req.body.email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)) {
    return badRequest(res, 'a valid email is required.')
  }
  next()
}

export function validateRecoveryCompletion(req, res, next) {
  if (!isNonEmptyString(req.body.refreshToken)) {
    return badRequest(res, 'a password recovery token is required.')
  }
  if (!isNonEmptyString(req.body.newPassword) || req.body.newPassword.length < 8) {
    return badRequest(res, 'newPassword must be at least 8 characters.')
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
  if (req.body.replyToCommentId !== undefined
    && (!Number.isSafeInteger(Number(req.body.replyToCommentId)) || Number(req.body.replyToCommentId) < 1)) {
    return badRequest(res, 'replyToCommentId must be a positive integer.')
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

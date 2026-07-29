export const ARTICLE_CATEGORIES = ['Thinker', 'Writer', 'Literature']
export const ARTICLE_STATUSES = ['draft', 'published']

function toCategory(value) {
  return ARTICLE_CATEGORIES.includes(value) ? value : 'Thinker'
}

function toSections(value) {
  if (!Array.isArray(value)) return []

  return value.map((section) => ({
    title: typeof section?.title === 'string' ? section.title : '',
    paragraphs: Array.isArray(section?.paragraphs)
      ? section.paragraphs.filter((paragraph) => typeof paragraph === 'string')
      : [],
    bullets: Array.isArray(section?.bullets)
      ? section.bullets
          .map((bullet) =>
            typeof bullet?.term === 'string' && typeof bullet?.description === 'string'
              ? { term: bullet.term, description: bullet.description }
              : null,
          )
          .filter(Boolean)
      : undefined,
  }))
}

function toSource(value) {
  if (!value || typeof value !== 'object') return undefined

  return typeof value.label === 'string' && typeof value.url === 'string'
    ? { label: value.label, url: value.url }
    : undefined
}

function formatDate(value) {
  return value ?? ''
}

function toComment(row) {
  return {
    id: row.id,
    author: row.author ?? 'Anonymous',
    avatar: row.avatar ?? '',
    date: row.display_date ?? formatDate(row.created_at),
    text: row.text ?? '',
  }
}

export function toArticle(row) {
  return {
    id: row.id,
    category: toCategory(row.category),
    tags: row.tags ?? [],
    title: row.title ?? '',
    status: row.status ?? (row.published_at ? 'published' : 'draft'),
    excerpt: row.excerpt ?? '',
    image: row.image_url ?? '',
    author: row.author ?? '',
    authorAvatar: row.author_avatar ?? '',
    authorBio: row.author_bio ?? [],
    date: row.display_date ?? formatDate(row.published_at),
    publishedAt: row.published_at ?? null,
    likes: row.likes ?? 0,
    sections: toSections(row.sections),
    source: toSource(row.source),
    comments: (row.comments ?? []).map(toComment),
  }
}

export function toArticleInsert(body) {
  const status = body.status === 'published' ? 'published' : 'draft'
  return {
    category: toCategory(body.category),
    tags: Array.isArray(body.tags) ? body.tags.filter((tag) => typeof tag === 'string') : [],
    title: String(body.title ?? '').trim(),
    status,
    excerpt: String(body.excerpt ?? '').trim(),
    image_url: body.image ?? body.image_url ?? null,
    author: String(body.author ?? '').trim(),
    author_avatar: body.authorAvatar ?? body.author_avatar ?? null,
    author_bio: Array.isArray(body.authorBio)
      ? body.authorBio.filter((paragraph) => typeof paragraph === 'string')
      : [],
    display_date: body.date ?? body.display_date ?? null,
    published_at: status === 'published' ? (body.published_at ?? new Date().toISOString()) : null,
    likes: Number.isInteger(body.likes) ? body.likes : 0,
    sections: toSections(body.sections),
    source: toSource(body.source) ?? null,
  }
}

export function toArticleUpdate(body) {
  const mapped = toArticleInsert(body)
  const fieldMap = {
    category: 'category',
    tags: 'tags',
    title: 'title',
    status: 'status',
    excerpt: 'excerpt',
    image: 'image_url',
    image_url: 'image_url',
    author: 'author',
    authorAvatar: 'author_avatar',
    author_avatar: 'author_avatar',
    authorBio: 'author_bio',
    author_bio: 'author_bio',
    date: 'display_date',
    display_date: 'display_date',
    published_at: 'published_at',
    likes: 'likes',
    sections: 'sections',
    source: 'source',
  }

  const update = Object.entries(fieldMap).reduce((updateFields, [inputKey, databaseKey]) => {
    if (Object.prototype.hasOwnProperty.call(body, inputKey)) {
      updateFields[databaseKey] = mapped[databaseKey]
    }
    return updateFields
  }, {})

  if (Object.prototype.hasOwnProperty.call(body, 'status')) {
    update.published_at = mapped.published_at
  }

  return update
}

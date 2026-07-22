const articleCategories = ['Thinker', 'Writer', 'Literature']

function toCategory(value) {
  return articleCategories.includes(value) ? value : 'Thinker'
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
  const update = toArticleInsert(body)

  for (const [key, value] of Object.entries(update)) {
    if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
      delete update[key]
    }
  }

  return update
}

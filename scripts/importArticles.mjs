import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { articles } from '../../oak-blogspot/src/data/articles.ts'

const requiredEnvironmentVariables = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]

for (const name of requiredEnvironmentVariables) {
  if (!process.env[name]) {
    throw new Error(`${name} is not configured.`)
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

function toPublishedDate(article) {
  if (article.status === 'draft') return null

  const candidate = article.publishedAt ?? article.date
  const parsed = new Date(candidate)
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString().slice(0, 10)
}

function toArticleRow(article) {
  const status = article.status ?? 'published'

  return {
    category: article.category,
    tags: article.tags ?? [],
    title: article.title,
    status,
    excerpt: article.excerpt,
    image_url: article.image || null,
    author: article.author,
    author_avatar: article.authorAvatar || null,
    author_bio: article.authorBio ?? [],
    display_date: article.date || null,
    published_at: toPublishedDate({ ...article, status }),
    likes: article.likes ?? 0,
    sections: article.sections ?? [],
    source: article.source ?? null,
  }
}

function toCommentRows(article, articleId) {
  return (article.comments ?? []).map((comment) => ({
    article_id: articleId,
    author: comment.author,
    avatar: comment.avatar || null,
    display_date: comment.date || null,
    text: comment.text,
  }))
}

const { count, error: countError } = await supabase
  .from('articles')
  .select('*', { count: 'exact', head: true })

if (countError) throw countError
if (count !== 0) {
  throw new Error(`Import stopped: articles table already contains ${count} row(s).`)
}

const insertedArticleIds = []
let insertedCommentCount = 0

try {
  for (const article of articles) {
    const { data: insertedArticle, error: articleError } = await supabase
      .from('articles')
      .insert(toArticleRow(article))
      .select('id')
      .single()

    if (articleError) throw articleError
    insertedArticleIds.push(insertedArticle.id)

    const comments = toCommentRows(article, insertedArticle.id)
    if (comments.length > 0) {
      const { error: commentsError } = await supabase
        .from('comments')
        .insert(comments)

      if (commentsError) throw commentsError
      insertedCommentCount += comments.length
    }
  }

  console.log(
    `Imported ${insertedArticleIds.length} articles and ${insertedCommentCount} comments.`,
  )
} catch (error) {
  if (insertedArticleIds.length > 0) {
    const { error: rollbackError } = await supabase
      .from('articles')
      .delete()
      .in('id', insertedArticleIds)

    if (rollbackError) {
      console.error('Automatic cleanup failed:', rollbackError.message)
    }
  }

  throw error
}

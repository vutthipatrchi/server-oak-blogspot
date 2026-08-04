import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const apply = process.argv.includes('--apply')
const bucket = process.env.SUPABASE_IMAGE_BUCKET ?? 'oakblog'
for (const name of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[name]) throw new Error(`${name} is not configured.`)
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const contentTypes = {
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

function checksum(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function sourceName(imageUrl) {
  if (typeof imageUrl !== 'string' || !imageUrl.startsWith('/article-images/')) return null
  const name = basename(imageUrl)
  return name === imageUrl.slice('/article-images/'.length) ? name : null
}

function storagePath(articleId, fileName) {
  const now = new Date()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `articles/${now.getUTCFullYear()}/${month}/legacy-${articleId}${extname(fileName).toLowerCase()}`
}

async function ensureUploaded(path, file, contentType) {
  const { data: existing, error: downloadError } = await supabase.storage.from(bucket).download(path)
  if (!downloadError && existing) {
    const stored = Buffer.from(await existing.arrayBuffer())
    if (checksum(stored) !== checksum(file)) {
      throw new Error(`Storage object already exists with different content: ${path}`)
    }
    return false
  }

  const missing = downloadError?.status === 404
    || downloadError?.statusCode === '404'
    || downloadError?.statusCode === 'not_found'
  if (!missing) throw downloadError

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType, upsert: false })
  if (error) throw error
  return true
}

const { data: articles, error: articlesError } = await supabase
  .from('articles')
  .select('id, title, image_url')
  .order('id')

if (articlesError) throw articlesError

const migration = []
for (const article of articles ?? []) {
  const fileName = sourceName(article.image_url)
  if (!fileName) continue
  const extension = extname(fileName).toLowerCase()
  const contentType = contentTypes[extension]
  if (!contentType) throw new Error(`Unsupported source image type: ${fileName}`)

  const file = await readFile(new URL(`../../oak-blogspot/public/article-images/${fileName}`, import.meta.url))
  migration.push({
    article,
    contentType,
    file,
    fileName,
    path: storagePath(article.id, fileName),
  })
}

if (migration.length === 0) {
  console.log('No legacy article images require migration.')
  process.exit(0)
}

console.log(`${apply ? 'Applying' : 'Planned'} migration to private bucket "${bucket}":`)
for (const item of migration) {
  console.log(`- article ${item.article.id}: ${item.fileName} -> ${item.path}`)
}

if (!apply) {
  console.log('Dry run complete. Re-run with --apply to upload files and update articles.image_url.')
  process.exit(0)
}

const completed = []
try {
  for (const item of migration) {
    const uploaded = await ensureUploaded(item.path, item.file, item.contentType)
    const { data: updated, error } = await supabase
      .from('articles')
      .update({ image_url: item.path })
      .eq('id', item.article.id)
      .eq('image_url', item.article.image_url)
      .select('id')
      .maybeSingle()

    if (error) {
      if (uploaded) await supabase.storage.from(bucket).remove([item.path])
      throw error
    }
    if (!updated) {
      if (uploaded) await supabase.storage.from(bucket).remove([item.path])
      throw new Error(`Article ${item.article.id} changed during migration; no update was applied.`)
    }

    completed.push({ ...item, uploaded })
    console.log(`Migrated article ${item.article.id}.`)
  }
} catch (error) {
  console.error('Migration failed. Rolling back completed rows...')
  for (const item of completed.reverse()) {
    const { error: rollbackError } = await supabase
      .from('articles')
      .update({ image_url: item.article.image_url })
      .eq('id', item.article.id)
      .eq('image_url', item.path)

    if (rollbackError) {
      console.error(`Could not roll back article ${item.article.id}: ${rollbackError.message}`)
      continue
    }
    if (item.uploaded) await supabase.storage.from(bucket).remove([item.path])
  }
  throw error
}

const { data: signed, error: signedError } = await supabase.storage
  .from(bucket)
  .createSignedUrls(migration.map((item) => item.path), 60)

if (signedError || signed?.some((item) => !item.signedUrl)) {
  throw signedError ?? new Error('One or more migrated images could not be signed.')
}

console.log(`Migration complete: ${completed.length} article images uploaded and verified.`)

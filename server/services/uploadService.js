import { randomUUID } from 'node:crypto'
import { HttpError } from '../errors/HttpError.js'
import { supabase } from '../supabase.js'

const IMAGE_BUCKET = process.env.SUPABASE_IMAGE_BUCKET ?? 'oakblog'
const SIGNED_URL_TTL = Number(process.env.SUPABASE_SIGNED_URL_TTL_SECONDS) || 60 * 60

const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function isManagedImagePath(value) {
  return typeof value === 'string'
    && /^(articles|profiles\/(admins|members))\/[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp)$/.test(value)
}

function hasExpectedSignature(file, contentType) {
  if (!Buffer.isBuffer(file)) return false
  if (contentType === 'image/jpeg') {
    return file.length >= 3 && file[0] === 0xff && file[1] === 0xd8 && file[2] === 0xff
  }
  if (contentType === 'image/png') {
    return file.length >= 8 && file.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  }
  if (contentType === 'image/webp') {
    return file.length >= 12
      && file.subarray(0, 4).toString('ascii') === 'RIFF'
      && file.subarray(8, 12).toString('ascii') === 'WEBP'
  }
  return false
}

async function createSignedUrl(path) {
  const { data, error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL)
  if (error || !data?.signedUrl) {
    throw new HttpError(502, 'Unable to create a temporary image URL.')
  }
  return data.signedUrl
}

async function uploadImage(file, contentType, directory) {
  const extension = EXTENSIONS[contentType]
  if (!extension) {
    throw new HttpError(415, 'Only JPEG, PNG, and WebP images are supported.')
  }
  if (!file?.length) throw new HttpError(400, 'An image file is required.')
  if (!hasExpectedSignature(file, contentType)) {
    throw new HttpError(415, 'The file content does not match the selected image type.')
  }

  const path = `${directory}/${randomUUID()}.${extension}`
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { contentType, upsert: false })

  if (error) throw new HttpError(502, 'Unable to upload image to storage.')
  return { path, url: await createSignedUrl(path) }
}

export function uploadArticleImage(file, contentType) {
  const now = new Date()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return uploadImage(file, contentType, `articles/${now.getUTCFullYear()}/${month}`)
}

export function uploadMemberProfileImage(file, contentType, memberId) {
  return uploadImage(file, contentType, `profiles/members/${memberId}`)
}

export function uploadAdminProfileImage(file, contentType, adminId = 'primary') {
  return uploadImage(file, contentType, `profiles/admins/${adminId}`)
}

export async function signImagePaths(paths) {
  const managedPaths = [...new Set(paths.filter(isManagedImagePath))]
  const signedUrls = new Map()
  if (managedPaths.length === 0) return signedUrls

  const { data, error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .createSignedUrls(managedPaths, SIGNED_URL_TTL)
  if (error) throw new HttpError(502, 'Unable to create temporary image URLs.')

  for (const item of data ?? []) {
    if (item.path && item.signedUrl) signedUrls.set(item.path, item.signedUrl)
  }
  return signedUrls
}

export async function signImagePath(path) {
  if (!isManagedImagePath(path)) return path ?? ''
  return createSignedUrl(path)
}

export async function deleteImage(path) {
  if (!isManagedImagePath(path)) return
  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove([path])
  if (error) throw new HttpError(502, 'Unable to remove image from storage.')
}

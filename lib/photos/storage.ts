import { createClient as createSbAdmin } from '@supabase/supabase-js'

/**
 * The progress-photo vault's storage — server only.
 *
 * A PRIVATE bucket: nothing in it has a public URL. Photos are shown through
 * signed links that expire (SIGNED_SECONDS), only to the person they belong
 * to, and are never sent to any AI. Files live under `<userId>/`, so an
 * account deletion can remove all of them by prefix.
 */
export const PHOTO_BUCKET = 'progress-photos'
/** Per person — the vault is for progress, not a camera roll. */
export const MAX_PHOTOS = 100
/** The phone shrinks each photo first (1600px, JPEG); this is the ceiling after. */
export const MAX_PHOTO_BYTES = 2_500_000
export const SIGNED_SECONDS = 30 * 60

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('storage not configured')
  return createSbAdmin(url, key)
}

let bucketReady = false
async function ensureBucket() {
  if (bucketReady) return
  const sb = admin()
  const { data } = await sb.storage.getBucket(PHOTO_BUCKET)
  if (!data) {
    const { error } = await sb.storage.createBucket(PHOTO_BUCKET, { public: false, fileSizeLimit: MAX_PHOTO_BYTES, allowedMimeTypes: ['image/jpeg'] })
    if (error && !/already exists/i.test(error.message)) throw new Error(`bucket: ${error.message}`)
  } else if (data.public) {
    // Never serve these publicly, even if someone flipped it in the dashboard.
    await sb.storage.updateBucket(PHOTO_BUCKET, { public: false })
  }
  bucketReady = true
}

/** JPEG starts FF D8 FF — the phone always sends JPEG; anything else is refused. */
export function isJpeg(buf: Buffer): boolean {
  return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
}

export async function putPhoto(path: string, buf: Buffer): Promise<void> {
  await ensureBucket()
  const { error } = await admin().storage.from(PHOTO_BUCKET).upload(path, buf, { contentType: 'image/jpeg', upsert: false })
  if (error) throw new Error(`upload: ${error.message}`)
}

export async function signedUrls(paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (!paths.length) return out
  const { data } = await admin().storage.from(PHOTO_BUCKET).createSignedUrls(paths, SIGNED_SECONDS)
  for (const d of data ?? []) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl)
  return out
}

export async function removePhotos(paths: string[]): Promise<void> {
  if (!paths.length) return
  await admin().storage.from(PHOTO_BUCKET).remove(paths)
}

/** Account deletion: every file under their folder. Never throws. */
export async function removeAllPhotosFor(userId: string): Promise<void> {
  try {
    const sb = admin()
    for (;;) {
      const { data } = await sb.storage.from(PHOTO_BUCKET).list(userId, { limit: 100 })
      if (!data?.length) return
      await sb.storage.from(PHOTO_BUCKET).remove(data.map(f => `${userId}/${f.name}`))
      if (data.length < 100) return
    }
  } catch (err) {
    console.error('[photos] account cleanup failed:', err)
  }
}

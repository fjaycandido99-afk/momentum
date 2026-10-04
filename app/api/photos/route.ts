import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { localDay } from '@/lib/assessment/service'
import { getActiveEra } from '@/lib/era/service'
import { MAX_PHOTOS, MAX_PHOTO_BYTES, isJpeg, putPhoto, removePhotos, signedUrls } from '@/lib/photos/storage'

export const dynamic = 'force-dynamic'

/**
 * The progress-photo vault (lib/photos/storage). Their own photos only:
 *   GET           newest first, each with a signed link that expires
 *   POST {data}   a base64 JPEG the phone already shrank
 *   DELETE ?id=   the file and its row
 * Never shared, never sent to any AI.
 */
async function me() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await me()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const rows = await prisma.progressPhoto.findMany({
      where: { user_id: user.id },
      orderBy: [{ local_day: 'desc' }, { created_at: 'desc' }],
      select: { id: true, local_day: true, era_id: true, path: true },
    })
    const urls = await signedUrls(rows.map(r => r.path))
    return NextResponse.json({
      max: MAX_PHOTOS,
      photos: rows.map(r => ({ id: r.id, day: r.local_day, eraId: r.era_id, url: urls.get(r.path) ?? null })),
    })
  } catch (error) {
    console.error('[photos GET] error:', error)
    return NextResponse.json({ error: 'Could not load your photos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await me()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { allowed } = rateLimit(`photos:${user.id}`, { limit: 10, windowSeconds: 60 })
  if (!allowed) return NextResponse.json({ error: 'Too many uploads. Try again in a minute.' }, { status: 429 })
  try {
    const body = await request.json().catch(() => null)
    const b64 = typeof body?.data === 'string' ? body.data.replace(/^data:image\/jpeg;base64,/, '') : ''
    const buf = Buffer.from(b64, 'base64')
    if (!buf.length || !isJpeg(buf)) return NextResponse.json({ error: 'That photo couldn’t be read.' }, { status: 400 })
    if (buf.length > MAX_PHOTO_BYTES) return NextResponse.json({ error: 'That photo is too large.' }, { status: 413 })
    const count = await prisma.progressPhoto.count({ where: { user_id: user.id } })
    if (count >= MAX_PHOTOS) return NextResponse.json({ error: `The vault holds ${MAX_PHOTOS} photos. Delete one to add another.` }, { status: 400 })

    const prefs = await prisma.userPreferences.findUnique({ where: { user_id: user.id }, select: { timezone: true } })
    const era = await getActiveEra(user.id).catch(() => null)
    const path = `${user.id}/${Date.now()}-${randomBytes(6).toString('hex')}.jpg`
    await putPhoto(path, buf)
    const row = await prisma.progressPhoto.create({
      data: { user_id: user.id, era_id: era?.id ?? null, local_day: localDay(prefs?.timezone ?? null), path },
      select: { id: true },
    })
    return NextResponse.json({ ok: true, id: row.id })
  } catch (error) {
    console.error('[photos POST] error:', error)
    return NextResponse.json({ error: 'Couldn’t save that photo.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const user = await me()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const id = request.nextUrl.searchParams.get('id') ?? ''
    const row = await prisma.progressPhoto.findFirst({ where: { id, user_id: user.id }, select: { id: true, path: true } })
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await removePhotos([row.path])
    await prisma.progressPhoto.delete({ where: { id: row.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[photos DELETE] error:', error)
    return NextResponse.json({ error: 'Couldn’t delete that photo.' }, { status: 500 })
  }
}

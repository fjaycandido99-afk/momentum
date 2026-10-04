/**
 * Shrink a photo on the phone before it leaves: longest side 1600px, JPEG
 * at 0.82 — typically a few hundred KB, under the upload ceiling, and the
 * original (with its location data) never leaves the device: drawing to a
 * canvas drops EXIF. Browser only.
 */
export async function shrinkPhoto(file: File, maxSide = 1600, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  return canvas.toDataURL('image/jpeg', quality)
}

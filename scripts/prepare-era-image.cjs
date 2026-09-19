#!/usr/bin/env node
/**
 * Prepare a generated era image for the home hero.
 *
 *   node scripts/prepare-era-image.cjs <source.png> <era_key> [left_fraction]
 *
 * The hero shows art as a tall strip on the right of the card (EraHome
 * heroShell: w-[62%], fading left into black), so the source is cropped to
 * its right side, resized to 720px wide (3x the ~212pt strip on an iPhone),
 * made grayscale and saved as a mozjpeg q78 JPEG in public/era/<era_key>.jpg.
 *
 * left_fraction (default 0.47) is where the crop starts, as a fraction of the
 * width. Lower it if the subject sits nearer the middle of the frame.
 *
 * After running it, set `image: '/era/<era_key>.jpg'` on the era in
 * lib/era/programs.ts (or ERA_START_IMAGE for the start hero). The
 * era-programs test fails if a path is set without the file committed.
 */
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

async function main() {
  const [src, key, leftArg] = process.argv.slice(2)
  if (!src || !key || !/^[a-z0-9_]+$/.test(key)) {
    console.error('usage: node scripts/prepare-era-image.cjs <source.png> <era_key> [left_fraction]')
    process.exit(1)
  }
  const leftFraction = leftArg ? Number(leftArg) : 0.47
  if (!(leftFraction >= 0 && leftFraction < 0.9)) throw new Error('left_fraction must be between 0 and 0.9')

  const meta = await sharp(src).metadata()
  const left = Math.round(meta.width * leftFraction)
  const out = path.join('public', 'era', `${key}.jpg`)
  fs.mkdirSync(path.dirname(out), { recursive: true })

  await sharp(src)
    .extract({ left, top: 0, width: meta.width - left, height: meta.height })
    .resize({ width: 720 })
    .grayscale()
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(out)

  const outMeta = await sharp(out).metadata()
  const kb = (fs.statSync(out).size / 1024).toFixed(0)
  const srcKb = (fs.statSync(src).size / 1024).toFixed(0)
  console.log(`${out}: ${outMeta.width}x${outMeta.height}, ${kb} KB (source ${meta.width}x${meta.height}, ${srcKb} KB)`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

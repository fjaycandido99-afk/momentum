#!/usr/bin/env node
/**
 * Prepare a generated achievement badge (a medallion on black) for the app.
 *
 *   node scripts/prepare-badge-image.cjs <source.png> <category>
 *
 * Badges render in a circle at 48px (grid) and 88px (unlock celebration), so
 * the black margin around the medallion is trimmed off — the coin should fill
 * the circle — then it's squared, resized to 264px (3x the largest size),
 * made grayscale, and saved as public/achievements/<category>.jpg.
 *
 * After running it, add the category to CATEGORY_BADGE_IMAGES in
 * lib/achievements.ts. The achievements test fails if a path is set without
 * the file committed.
 */
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const CATEGORIES = ['era', 'consistency', 'explorer', 'dedication', 'mastery', 'growth', 'secret']

async function main() {
  const [src, category] = process.argv.slice(2)
  if (!src || !CATEGORIES.includes(category)) {
    console.error(`usage: node scripts/prepare-badge-image.cjs <source.png> <${CATEGORIES.join('|')}>`)
    process.exit(1)
  }

  // Trim the near-black surround so the medallion's edge meets the frame.
  const trimmed = await sharp(src).trim({ background: '#000000', threshold: 28 }).toBuffer({ resolveWithObject: true })
  const { width, height } = trimmed.info
  const side = Math.min(width, height)

  const out = path.join('public', 'achievements', `${category}.jpg`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  await sharp(trimmed.data)
    .extract({ left: Math.floor((width - side) / 2), top: Math.floor((height - side) / 2), width: side, height: side })
    .resize(264, 264)
    .grayscale()
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(out)

  const meta = await sharp(src).metadata()
  console.log(`${out}: 264x264, ${(fs.statSync(out).size / 1024).toFixed(0)} KB (source ${meta.width}x${meta.height}, trimmed to ${width}x${height})`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

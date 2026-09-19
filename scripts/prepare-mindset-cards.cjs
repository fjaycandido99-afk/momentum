#!/usr/bin/env node
/**
 * Rebuild the mindset picker's card images from public/portraits/*.jpg.
 *
 *   node scripts/prepare-mindset-cards.cjs
 *
 * Cards are 3:4, anchored to the top (faces sit high in the portraits),
 * 480x640 grayscale mozjpeg — ~50 KB each against 0.4-1.5 MB originals.
 * Run it after replacing any portrait.
 */
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

;(async () => {
  const dir = 'public/portraits'
  const out = path.join(dir, 'cards')
  fs.mkdirSync(out, { recursive: true })
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.jpg'))) {
    await sharp(path.join(dir, f))
      .resize(480, 640, { fit: 'cover', position: 'north' })
      .grayscale()
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(path.join(out, f))
    console.log(`${out}/${f}: ${(fs.statSync(path.join(out, f)).size / 1024).toFixed(0)} KB`)
  }
})().catch(err => { console.error(err); process.exit(1) })

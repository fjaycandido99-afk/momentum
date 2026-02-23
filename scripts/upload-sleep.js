const { createClient } = require('@supabase/supabase-js')
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const FILES = [
  'c:\\Users\\fjayc\\Downloads\\CyberPunk Style Art.jpg',
  'c:\\Users\\fjayc\\Downloads\\download (89).jpg',
  'c:\\Users\\fjayc\\Downloads\\download (90).jpg',
  'c:\\Users\\fjayc\\Downloads\\download (91).jpg',
  'c:\\Users\\fjayc\\Downloads\\download (92).jpg',
  'c:\\Users\\fjayc\\Downloads\\download (93).jpg',
]

// These have special characters — find via directory listing
const SPECIAL_NAMES = [
  '#девушка',
  'Girl phone wallpaper',
]

const FILES2 = [
  'c:\\Users\\fjayc\\Downloads\\download (94).jpg',
  'c:\\Users\\fjayc\\Downloads\\Love Yourself First, Love Life Later.jpg',
  'c:\\Users\\fjayc\\Downloads\\download (95).jpg',
  'c:\\Users\\fjayc\\Downloads\\download (97).jpg',
  'c:\\Users\\fjayc\\Downloads\\download (96).jpg',
  'c:\\Users\\fjayc\\Downloads\\Sleepy.jpg',
]

async function main() {
  // Build full list — resolve special filenames via directory listing
  const allFiles = [...FILES]

  const dlDir = 'C:/Users/fjayc/Downloads'
  const dirFiles = fs.readdirSync(dlDir)

  for (const pattern of SPECIAL_NAMES) {
    const match = dirFiles.find(f => f.includes(pattern))
    if (match) allFiles.push(path.join(dlDir, match))
    else console.log(`WARN: no file matching "${pattern}"`)
  }

  allFiles.push(...FILES2)

  for (let i = 0; i < allFiles.length; i++) {
    const src = allFiles[i]
    const name = `sleep-${String(i + 1).padStart(2, '0')}.jpg`
    const basename = path.basename(src)

    if (!fs.existsSync(src)) {
      console.log(`SKIP ${basename} — not found`)
      continue
    }

    console.log(`Processing ${basename} → ${name}`)

    const raw = fs.readFileSync(src)
    const buf = await sharp(raw)
      .resize(1080, 1920, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer()

    const { error } = await supabase.storage
      .from('backgrounds')
      .upload(`sleep/${name}`, buf, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (error) console.error(`  FAIL: ${error.message}`)
    else console.log(`  ✓ uploaded (${(buf.length / 1024).toFixed(0)} KB)`)
  }
  console.log(`Done — ${allFiles.length} sleep images uploaded`)
}

main().catch(console.error)

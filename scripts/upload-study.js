const { createClient } = require('@supabase/supabase-js')
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const FILES = [
  'c:\\Users\\fjayc\\Downloads\\SteamPunk Style Art.jpg',
  'c:\\Users\\fjayc\\Downloads\\Chill Study Inspiration.jpg',
  'c:\\Users\\fjayc\\Downloads\\Rise & Reset Your Mind.jpg',
  'c:\\Users\\fjayc\\Downloads\\Daily Mindset Boost.jpg',
  'c:\\Users\\fjayc\\Downloads\\download (72).jpg',
  'c:\\Users\\fjayc\\Downloads\\download (73).jpg',
  'c:\\Users\\fjayc\\Downloads\\Art 65.jpg',
  'c:\\Users\\fjayc\\Downloads\\download (74).jpg',
  'c:\\Users\\fjayc\\Downloads\\download (75).jpg',
  'c:\\Users\\fjayc\\Downloads\\download (76).jpg',
  'c:\\Users\\fjayc\\Downloads\\Candlelit winter evening fireplace ambience for tea drinking and relaxing after work 🕯️.jpg',
  'c:\\Users\\fjayc\\Downloads\\download (77).jpg',
  'c:\\Users\\fjayc\\Downloads\\Study Session_ Preparing with Exercises.jpg',
  'c:\\Users\\fjayc\\Downloads\\My ideal _golden hour_ with a book.jpg',
  'c:\\Users\\fjayc\\Downloads\\Study inspiration aesthetic.jpg',
]

async function main() {
  for (let i = 0; i < FILES.length; i++) {
    const src = FILES[i]
    const name = `study-${String(i + 1).padStart(2, '0')}.jpg`
    console.log(`Processing ${path.basename(src)} → ${name}`)

    const raw = fs.readFileSync(src)
    const buf = await sharp(raw)
      .resize(1080, 1920, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer()

    const { error } = await supabase.storage
      .from('backgrounds')
      .upload(`study/${name}`, buf, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (error) console.error(`  FAIL: ${error.message}`)
    else console.log(`  ✓ uploaded (${(buf.length / 1024).toFixed(0)} KB)`)
  }
  console.log('Done — 15 study images uploaded')
}

main().catch(console.error)

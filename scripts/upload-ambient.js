const { createClient } = require('@supabase/supabase-js')
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const FILES = [
  'c:\\Users\\fjayc\\Downloads\\download (88).jpg',
  'c:\\Users\\fjayc\\Downloads\\download (87).jpg',
  'c:\\Users\\fjayc\\Downloads\\download (86).jpg',
  'c:\\Users\\fjayc\\Downloads\\download (85).jpg',
  'c:\\Users\\fjayc\\Downloads\\download (84).jpg',
  'c:\\Users\\fjayc\\Downloads\\Summer Bus Stop in Field.jpg',
  'c:\\Users\\fjayc\\Downloads\\download (83).jpg',
  'c:\\Users\\fjayc\\Downloads\\download (82).jpg',
  'c:\\Users\\fjayc\\Downloads\\download (81).jpg',
  'c:\\Users\\fjayc\\Downloads\\Wallpaper ideas (1).jpg',
  'c:\\Users\\fjayc\\Downloads\\download (80).jpg',
  'c:\\Users\\fjayc\\Downloads\\download (79).jpg',
  'c:\\Users\\fjayc\\Downloads\\download (78).jpg',
  "c:\\Users\\fjayc\\Downloads\\\u1011\u2618'\ud835\udc7e\ud835\udc82\ud835\udc8d\ud835\udc8d\ud835\udc91\ud835\udc82\ud835\udc91\ud835\udc86\ud835\udc93'_ \u0357\u0317\u0300\u27db.jpg",
  'c:\\Users\\fjayc\\Downloads\\\u2736 Wallpaper.jpg',
  'c:\\Users\\fjayc\\Downloads\\#\ud83d\udc40.jpg',
  'c:\\Users\\fjayc\\Downloads\\#wallpaper.jpg',
]

async function main() {
  for (let i = 0; i < FILES.length; i++) {
    const src = FILES[i]
    const name = `ambient-${String(i + 1).padStart(2, '0')}.jpg`
    const basename = path.basename(src)

    if (!fs.existsSync(src)) {
      console.log(`SKIP ${basename} — file not found`)
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
      .upload(`ambient/${name}`, buf, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (error) console.error(`  FAIL: ${error.message}`)
    else console.log(`  ✓ uploaded (${(buf.length / 1024).toFixed(0)} KB)`)
  }
  console.log('Done — ambient images uploaded')
}

main().catch(console.error)

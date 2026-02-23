const { createClient } = require('@supabase/supabase-js')
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const FILES = [
  'c:\\Users\\fjayc\\Downloads\\download (71).jpg',
  'c:\\Users\\fjayc\\Downloads\\download (67).jpg',
  'c:\\Users\\fjayc\\Downloads\\amoled Ringtones and Wallpapers - Free by ZEDGE™ (1).jpg',
  'c:\\Users\\fjayc\\Downloads\\download (68).jpg',
  'c:\\Users\\fjayc\\Downloads\\download (69).jpg',
  'c:\\Users\\fjayc\\Downloads\\download (70).jpg',
  'c:\\Users\\fjayc\\Downloads\\JOJADOJA_ #jojadoja #jjdoja__.jpg',
  'c:\\Users\\fjayc\\Downloads\\The Lonely Note; West End, Irongate, Iron Harbor.jpg',
  'c:\\Users\\fjayc\\Downloads\\Sleepy Jazz Night 🎶💤 _ Relaxing Music for Deep Rest.jpg',
  'c:\\Users\\fjayc\\Downloads\\#sax #jazz #urban #AiArt #LeonardoAi.jpg',
]

async function main() {
  for (let i = 0; i < FILES.length; i++) {
    const src = FILES[i]
    const name = `jazz-${String(i + 1).padStart(2, '0')}.jpg`
    console.log(`Processing ${path.basename(src)} → ${name}`)

    const raw = fs.readFileSync(src)
    const buf = await sharp(raw)
      .resize(1080, 1920, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer()

    const { error } = await supabase.storage
      .from('backgrounds')
      .upload(`jazz/${name}`, buf, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (error) console.error(`  FAIL: ${error.message}`)
    else console.log(`  ✓ uploaded (${(buf.length / 1024).toFixed(0)} KB)`)
  }
  console.log('Done — 10 jazz images uploaded')
}

main().catch(console.error)

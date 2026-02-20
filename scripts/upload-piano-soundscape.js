require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const FILES = [
  'c:\\Users\\fjayc\\Downloads\\Whisk_ifdnygznjvgoirtntewojhtlivjy00iz1cdmtiw.jpeg',
  'c:\\Users\\fjayc\\Downloads\\Whisk_atowuwowymy1gtnx0cnwewotignkrtlhnjnj1cn.jpeg',
  'c:\\Users\\fjayc\\Downloads\\Whisk_2czywymy1mjzjnzntq2mkltlkjdn00in1e2mtyt.jpeg',
  'c:\\Users\\fjayc\\Downloads\\Whisk_zutoivmzxujywm2ntudz2gtljf2n00czhrznti2.jpeg',
  'c:\\Users\\fjayc\\Downloads\\Whisk_hjwo0atmhrdnibdzty2y0gtl1m2y00iz3emztyj.jpeg',
]

async function main() {
  // First delete old images
  console.log('Deleting old piano soundscape images...')
  const oldFiles = Array.from({ length: 5 }, (_, i) => `piano-soundscape/piano-${String(i + 1).padStart(2, '0')}.jpg`)
  const { error: delErr } = await supabase.storage.from('backgrounds').remove(oldFiles)
  if (delErr) console.error('Delete error:', delErr.message)
  else console.log(`Deleted ${oldFiles.length} old images`)

  // Upload new images
  for (let i = 0; i < FILES.length; i++) {
    const src = FILES[i]
    const name = `piano-${String(i + 1).padStart(2, '0')}.jpg`
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
      .upload(`piano-soundscape/${name}`, buf, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (error) console.error(`  FAIL: ${error.message}`)
    else console.log(`  ✓ uploaded (${(buf.length / 1024).toFixed(0)} KB)`)
  }
  console.log('Done — 5 piano soundscape images replaced')
}

main().catch(console.error)

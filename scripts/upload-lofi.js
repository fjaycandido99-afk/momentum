require('dotenv').config({ path: '.env' });
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FILES = [
  'c:/Users/fjayc/Downloads/4K Synthwave Wallpaper_ Retro Vibes in Stunning High Definition!.jpg',
  'c:/Users/fjayc/Downloads/download (51).jpg',
  'c:/Users/fjayc/Downloads/download (52).jpg',
  'c:/Users/fjayc/Downloads/download (53).jpg',
  'c:/Users/fjayc/Downloads/lofi wallpapers.jpg',
  'c:/Users/fjayc/Downloads/download (54).jpg',
  'c:/Users/fjayc/Downloads/soirée chill solo cosy.jpg',
  'c:/Users/fjayc/Downloads/download (55).jpg',
  'c:/Users/fjayc/Downloads/download (56).jpg',
  'c:/Users/fjayc/Downloads/download (57).jpg',
  'c:/Users/fjayc/Downloads/download (58).jpg',
  'c:/Users/fjayc/Downloads/Night rain and retro vibes 🌧️.jpg',
  'c:/Users/fjayc/Downloads/download (59).jpg',
  'c:/Users/fjayc/Downloads/download (60).jpg',
  'c:/Users/fjayc/Downloads/download (61).jpg',
  'c:/Users/fjayc/Downloads/download (62).jpg',
  'c:/Users/fjayc/Downloads/download (63).jpg',
];

async function upload() {
  let success = 0;
  for (let i = 0; i < FILES.length; i++) {
    const src = FILES[i];
    const name = `lofi-${String(i + 1).padStart(2, '0')}.jpg`;
    try {
      const buf = fs.readFileSync(src);
      const processed = await sharp(buf)
        .resize(1080, 1920, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer();

      const { error } = await supabase.storage
        .from('backgrounds')
        .upload(`lofi/${name}`, processed, { contentType: 'image/jpeg', upsert: true });

      if (error) { console.error(`  ${name}: ${error.message}`); }
      else { success++; console.log(`  ${name} OK`); }
    } catch (e) { console.error(`  ${name}: ${e.message}`); }
  }
  console.log(`DONE - ${success}/${FILES.length} uploaded`);
}
upload().catch(console.error);

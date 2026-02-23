require('dotenv').config({ path: '.env' });
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const genres = ['lofi', 'piano', 'jazz', 'classical', 'ambient', 'study', 'sleep'];

async function reprocessAll() {
  let total = 0, success = 0, fail = 0;
  for (const genre of genres) {
    const { data } = await supabase.storage.from('backgrounds').list(genre, { limit: 200, sortBy: { column: 'name', order: 'asc' } });
    const images = data.filter(f => /\.(jpg|jpeg|png|webp)/i.test(f.name));
    console.log(genre + ': ' + images.length + ' images');

    for (const file of images) {
      total++;
      try {
        const url = SB + '/storage/v1/object/public/backgrounds/' + genre + '/' + encodeURIComponent(file.name);
        const res = await fetch(url);
        if (!res.ok) { fail++; continue; }
        const buf = Buffer.from(await res.arrayBuffer());

        const processed = await sharp(buf)
          .resize(1080, 1920, { fit: 'contain', background: { r: 0, g: 0, b: 0 } })
          .jpeg({ quality: 92, mozjpeg: true })
          .toBuffer();

        const { error } = await supabase.storage
          .from('backgrounds')
          .upload(genre + '/' + file.name, processed, { contentType: 'image/jpeg', upsert: true });

        if (error) { fail++; } else { success++; }
      } catch (e) { fail++; console.error('  ' + file.name + ': ' + e.message); }
    }
    console.log('  done (' + success + '/' + total + ')');
  }
  console.log('DONE - Total: ' + total + ', Success: ' + success + ', Failed: ' + fail);
}
reprocessAll().catch(console.error);

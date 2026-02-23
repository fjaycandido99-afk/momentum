require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const genres = ['lofi', 'piano', 'jazz', 'classical', 'ambient', 'study', 'sleep'];

async function deleteAll() {
  for (const genre of genres) {
    const { data, error } = await supabase.storage.from('backgrounds').list(genre, { limit: 200 });
    if (error) { console.error(genre + ': list error', error.message); continue; }

    const files = data.filter(f => /\.(jpg|jpeg|png|webp)/i.test(f.name));
    if (files.length === 0) { console.log(genre + ': empty'); continue; }

    const paths = files.map(f => genre + '/' + f.name);
    const { error: delErr } = await supabase.storage.from('backgrounds').remove(paths);
    if (delErr) { console.error(genre + ': delete error', delErr.message); }
    else { console.log(genre + ': deleted ' + files.length + ' images'); }
  }
  console.log('DONE');
}
deleteAll().catch(console.error);

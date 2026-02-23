require('dotenv').config({ path: '.env' });
const sharp = require('sharp');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DL = 'c:/Users/fjayc/Downloads';
const FILES = [
  `${DL}/download (64).jpg`,
  `${DL}/Whisk_hjwo0atmhrdnibdzty2y0gtl1m2y00iz3emztyj (1).jpeg`,
  `${DL}/download (65).jpg`,
  `${DL}/Ghibli inspired ✨️.jpg`,
  `${DL}/The Woman Who Played Piano Throught Her Heart ❤️.jpg`,
  `${DL}/download (66).jpg`,
  `${DL}/Whisk_5udz1ymz4imzzywotkdzmfwlmdzm00ym5mtmtct.jpeg`,
  `${DL}/Whisk_xigzknmm0uwzivwztqjm2gtl5qjy00sn4uzntaj.jpeg`,
  `${DL}/Whisk_hzjymdtyjrmz5adntmjyziwl3qgz00iy3cdoteg.jpeg`,
  `${DL}/Whisk_0i2y5gdninjy3kjytyzykfwl0ejn00cnmnwntiz.jpeg`,
  `${DL}/Whisk_3q2mmrjz3immymtytizy1ewl1qmy00coziwmted.jpeg`,
  `${DL}/Whisk_hdtmhltmhvmn1emmtgzmwiwljdtn00izwetmtut.jpeg`,
  `${DL}/Whisk_kbjzindnhlzmiddotijmxiwl4qwy00coirmztqm.jpeg`,
  `${DL}/Whisk_xety4ytykzmyivmmtygzziwl0azy00so4idzted.jpeg`,
  `${DL}/Whisk_4gjm2itnlzgmiv2mtajz5ktlifjz00szhvgztmz.jpeg`,
  `${DL}/Whisk_zutoivmzxujywm2ntudz2gtljf2n00czhrznti2.jpeg`,
  `${DL}/Whisk_krwnykdnmnmyinwmtegmifwl5u2y00ynyidotmd.jpeg`,
  `${DL}/Whisk_mfjmljgnjjjyxqjmtcdmwiwl2qwm00co0i2ytkt.jpeg`,
  `${DL}/Whisk_izzmkbjz0czmzidotgjyjfwl0ctm00smyugztqw.jpeg`,
  `${DL}/Whisk_2czywymy1mjzjnzntq2mkltlkjdn00in1e2mtyt.jpeg`,
  `${DL}/Whisk_jrmmlnjy4ymmmvmntidojhtl2ito00ymxetntug.jpeg`,
  `${DL}/Whisk_5yjyzity3ywn1ejmtego1gtlwewm00iyiddmtuj.jpeg`,
  `${DL}/Whisk_zkjnhvgmxqdmkjgotmjziltlhdjn00co3mwntqm.jpeg`,
  `${DL}/Whisk_wyjzhrtomzdnifwmtijyijwlwmzy00cmmlzntmw.jpeg`,
  `${DL}/Whisk_1ewnjnwzyqwmmdzntgto2ewlivmm00sy5qgntym.jpeg`,
  `${DL}/Whisk_hjwo0atmhrdnibdzty2y0gtl1m2y00iz3emztyj.jpeg`,
  `${DL}/Whisk_1ajmjn2nwctnyajztmwyijwlyqwz00yy5admtyd.jpeg`,
  `${DL}/Whisk_1azmyutzyyjy4udntajy0iwl0qtz00yy4idotet.jpeg`,
  `${DL}/Whisk_xgzn1kdo0ignxymmtadzxewlijmy00iy0mwyty2.jpeg`,
  `${DL}/Whisk_hzmz2mtz2edn0ywmtkdm5ewl0ajm00cz1mjntmw.jpeg`,
  `${DL}/Whisk_lzwmmf2y2y2nlrjntetz1iwllntz00inkldntez.jpeg`,
  `${DL}/Whisk_3cdo2gznyejn1ydotuwzmhtllr2n00iz0igmtiw.jpeg`,
  `${DL}/Whisk_0cjyzgtnxatm0iwmtitmhltljdjz00yn4gdntaz.jpeg`,
  `${DL}/Whisk_ifdnygznjvgoirtntewojhtlivjy00iz1cdmtiw.jpeg`,
  `${DL}/Whisk_y2mwetn0iwojzdm00smjdtyte2nkrtlljgzx0co.jpeg`,
  `${DL}/Whisk_itz2ygm0ewmmn2m10cnyumytqjy5qtl2ednh1ym.jpeg`,
  `${DL}/Whisk_u2m5edm4egnxqwz10yn3ytotywnzqtl1ajnm1sz.jpeg`,
  `${DL}/Whisk_ydmzkzn1imyxywo10ymldjytm2ymrtlmddo20yn.jpeg`,
  `${DL}/Whisk_mdo4cdoxujnlbtok1ymjztotqjz4qtlinzn30iy.jpeg`,
  `${DL}/Whisk_atyziwz4azmmfdnk1cmhhtotijyirtl5mtm10cz.jpeg`,
  `${DL}/Whisk_atoijjzmjjzjltm30so0utotetmirtlzyjyi1sz.jpeg`,
  `${DL}/Whisk_atowuwowymy1gtnx0cnwewotignkrtlhnjnj1cn.jpeg`,
];

const GENRES = ['piano', 'classical'];

async function upload() {
  // Filter to only files that exist
  const validFiles = [];
  for (const f of FILES) {
    if (fs.existsSync(f)) validFiles.push(f);
    else console.log(`SKIP (not found): ${f.split('/').pop()}`);
  }
  console.log(`Found ${validFiles.length}/${FILES.length} files`);

  for (const genre of GENRES) {
    let success = 0;
    console.log(`\n--- Uploading to ${genre}/ ---`);
    for (let i = 0; i < validFiles.length; i++) {
      const src = validFiles[i];
      const name = `${genre}-${String(i + 1).padStart(2, '0')}.jpg`;
      try {
        const buf = fs.readFileSync(src);
        const processed = await sharp(buf)
          .resize(1080, 1920, { fit: 'cover', position: 'center' })
          .jpeg({ quality: 90, mozjpeg: true })
          .toBuffer();

        const { error } = await supabase.storage
          .from('backgrounds')
          .upload(`${genre}/${name}`, processed, { contentType: 'image/jpeg', upsert: true });

        if (error) { console.error(`  ${name}: ${error.message}`); }
        else { success++; }
      } catch (e) { console.error(`  ${name}: ${e.message}`); }
    }
    console.log(`${genre}: ${success}/${validFiles.length} uploaded`);
  }
  console.log('\nDONE');
}
upload().catch(console.error);

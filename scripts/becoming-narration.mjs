// Generates the /becoming narration in Voxu Voice, once, as static MP3s
// (public/audio/becoming/<section>.mp3). Same voice, model and settings as
// the app's speaking path (lib/daily-guide/audio-utils.ts). Reads
// ELEVENLABS_API_KEY from the environment or .env; never prints it.
//   node scripts/becoming-narration.mjs            # only missing files
//   node scripts/becoming-narration.mjs --force    # regenerate all
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
function envKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY
  for (const f of ['.env.local', '.env']) {
    const p = path.join(root, f)
    if (!fs.existsSync(p)) continue
    const line = fs.readFileSync(p, 'utf8').split(/\r?\n/).find((l) => l.startsWith('ELEVENLABS_API_KEY='))
    if (line) return line.slice('ELEVENLABS_API_KEY='.length).trim().replace(/^["']|["']$/g, '')
  }
  return null
}
const key = envKey()
if (!key) {
  console.error('No ELEVENLABS_API_KEY found.')
  process.exit(1)
}

// The lines, parsed from components/becoming/script.ts so there is one source.
const src = fs.readFileSync(path.join(root, 'components/becoming/script.ts'), 'utf8')
const lines = [...src.matchAll(/^\s*(\w+):\s*'((?:[^'\\]|\\.)*)',?$/gm)].map((m) => [m[1], m[2].replace(/\\'/g, "'")])
const VOICE = process.env.VOXU_VOICE_ID || 'ahz6lhTYyJtfoR5eZpUg'
const SETTINGS = { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true, speed: 0.95 }
const out = path.join(root, 'public/audio/becoming')
fs.mkdirSync(out, { recursive: true })
const force = process.argv.includes('--force')

let chars = 0
for (const [id, text] of lines) {
  const file = path.join(out, `${id}.mp3`)
  if (!force && fs.existsSync(file)) continue
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_96`, {
    method: 'POST',
    headers: { Accept: 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': key },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: SETTINGS }),
  })
  if (!res.ok) {
    console.error(`${id}: ${res.status} ${(await res.text()).slice(0, 200)}`)
    process.exit(1)
  }
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  chars += text.length
  console.log(`${id}.mp3  (${text.length} chars)`)
}
console.log(`done, ${chars} characters spent`)

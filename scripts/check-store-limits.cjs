/**
 * Counts every store field against the platform's cap.
 *
 * Both stores silently truncate or refuse on paste, which you find out while
 * standing in the submission form. Play's release notes are 500 characters —
 * an eighth of Apple's 4000 — so the two What's New sections cannot be the
 * same text, and that is the limit most likely to be exceeded by accident.
 *
 * Run before pasting anything: node scripts/check-store-limits.cjs
 */
const fs = require('fs')

function reader(path) {
  const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/)
  return function sec(name) {
    const start = lines.findIndex(l => l.trim() === '## ' + name)
    if (start === -1) return null
    const rest = lines.slice(start + 1)
    let end = rest.findIndex(l => l.startsWith('## ') || l.trim() === '---')
    if (end === -1) end = rest.length
    return rest.slice(0, end).join('\n').replace(/<!--[\s\S]*?-->/g, '').trim()
  }
}

const STORES = [
  {
    label: 'App Store',
    path: 'store-metadata/app-store.md',
    limits: [
      ['App Name', 30],
      ['Subtitle', 30],
      ['Promotional Text', 170],
      ['Keywords', 100],
      ['Description', 4000],
      ["What's New", 4000],
    ],
  },
  {
    label: 'Play Store',
    path: 'store-metadata/play-store.md',
    limits: [
      ['App Name', 30],
      ['Short Description', 80],
      ['Full Description', 4000],
      ['Release Notes', 500],
    ],
  },
]

let bad = 0
for (const store of STORES) {
  console.log('\n' + store.label)
  const sec = reader(store.path)
  for (const [name, lim] of store.limits) {
    const s = sec(name)
    if (s === null) { console.log('  MISSING'.padEnd(8), name); bad++; continue }
    const ok = s.length <= lim
    if (!ok) bad++
    console.log('  ' + (ok ? 'OK' : 'OVER').padEnd(6), name.padEnd(18), s.length + '/' + lim)
  }
}

// Apple's keyword field is comma-separated with no spaces; a space after a
// comma is indexed as part of the next keyword and wastes a character.
const kw = reader(STORES[0].path)('Keywords') || ''
console.log('\nApple keywords:', kw.split(',').length, 'terms, space-after-comma:', /,\s/.test(kw))
process.exit(bad ? 1 : 0)

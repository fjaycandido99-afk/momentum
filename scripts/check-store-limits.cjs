const fs = require('fs')
const t = fs.readFileSync('store-metadata/app-store.md', 'utf8')
const lines = t.split(/\r?\n/)

function sec(name) {
  const start = lines.findIndex(l => l.trim() === '## ' + name)
  if (start === -1) return null
  const rest = lines.slice(start + 1)
  let end = rest.findIndex(l => l.startsWith('## ') || l.trim() === '---')
  if (end === -1) end = rest.length
  return rest.slice(0, end).join('\n').replace(/<!--[\s\S]*?-->/g, '').trim()
}

const limits = [
  ['App Name', 30],
  ['Subtitle', 30],
  ['Promotional Text', 170],
  ['Keywords', 100],
  ['Description', 4000],
  ["What's New", 4000],
]

let bad = 0
for (const [name, lim] of limits) {
  const s = sec(name)
  if (s === null) { console.log('MISSING'.padEnd(5), name); bad++; continue }
  const len = s.length
  const ok = len <= lim
  if (!ok) bad++
  console.log((ok ? 'OK' : 'OVER').padEnd(5), name.padEnd(18), len + '/' + lim)
}

const kw = sec('Keywords') || ''
console.log('keywords have a space after a comma:', /,\s/.test(kw))
console.log('keyword count:', kw.split(',').length)
process.exit(bad ? 1 : 0)

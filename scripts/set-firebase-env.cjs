#!/usr/bin/env node
/**
 * Puts the Firebase service-account key on Vercel so the server can send
 * Android pushes (lib/fcm.ts reads FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,
 * FIREBASE_PRIVATE_KEY). They apply from the next production deploy.
 *
 *   node scripts/set-firebase-env.cjs <path-to-service-account.json>
 *
 * The key goes straight from the file to Vercel: nothing is printed and
 * nothing is written to disk. Delete the downloaded .json afterwards.
 */
const fs = require('fs')
const { spawnSync } = require('child_process')

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/set-firebase-env.cjs <service-account.json>')
  process.exit(1)
}
const sa = JSON.parse(fs.readFileSync(file, 'utf8'))
if (sa.type !== 'service_account' || !sa.private_key || !sa.client_email || !sa.project_id) {
  console.error('That file is not a Firebase service-account key (Project settings → Service accounts → Generate new private key).')
  process.exit(1)
}

const vars = {
  FIREBASE_PROJECT_ID: sa.project_id,
  FIREBASE_CLIENT_EMAIL: sa.client_email,
  // One line, with \n written out: lib/fcm.ts turns them back into newlines.
  FIREBASE_PRIVATE_KEY: sa.private_key.replace(/\n/g, '\\n'),
}

const vercel = (args, input) =>
  spawnSync('npx', ['vercel', ...args], { input, encoding: 'utf8', shell: true, stdio: ['pipe', 'pipe', 'pipe'] })

for (const [name, value] of Object.entries(vars)) {
  vercel(['env', 'rm', name, 'production', '--yes']) // replacing is fine; absent is fine
  const r = vercel(['env', 'add', name, 'production'], value)
  if (r.status !== 0) {
    console.error(`Could not set ${name}:\n${(r.stderr || r.stdout || '').trim()}`)
    process.exit(1)
  }
  console.log(`Set ${name} on Vercel (production).`)
}

// No `vercel deploy` from here: it would upload this folder's uncommitted
// files too. The next push to master redeploys with the new settings.
console.log(`Done: project ${sa.project_id}. They apply from the next deploy (push to master). You can delete ${file} now.`)

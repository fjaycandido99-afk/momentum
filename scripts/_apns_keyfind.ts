/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * APNs key prober — tests every .p8 file in C:/Users/fjayc/Downloads/
 * against Apple's APNs server with the TEAM_ID + BUNDLE_ID from .env,
 * deriving KEY_ID from each file's name (AuthKey_<KEY_ID>.p8).
 *
 * For each file it builds a JWT, sends a push to a dummy device token,
 * and reports the APNs response:
 *  - reason "BadDeviceToken" → JWT was ACCEPTED (key is valid, only
 *    the dummy token failed). This means KEY_ID + .p8 is good.
 *  - reason "InvalidProviderToken" → JWT was REJECTED (this key is
 *    revoked or doesn't belong to this team). DON'T USE.
 *
 * Run: npx tsx scripts/_apns_keyfind.ts
 * Requires APNS_TEAM_ID + APNS_BUNDLE_ID in .env (already there).
 */
import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import * as http2 from 'http2'
const jwt = require('jsonwebtoken')

const DOWNLOADS = 'C:/Users/fjayc/Downloads'
const TEAM_ID = process.env.APNS_TEAM_ID || ''
const BUNDLE_ID = process.env.APNS_BUNDLE_ID || 'com.voxu.app'

// Hosts to test. Apple's responses tell us if the key is good on either.
const HOSTS = {
  production: 'https://api.push.apple.com',
  sandbox: 'https://api.sandbox.push.apple.com',
}

// Any 64-hex-char string works — APNs validates JWT BEFORE token format,
// so a JWT failure surfaces as InvalidProviderToken regardless.
const DUMMY_TOKEN = '0'.repeat(64)

function listKeys(): { keyId: string; path: string }[] {
  const out: { keyId: string; path: string }[] = []
  for (const f of fs.readdirSync(DOWNLOADS)) {
    const m = f.match(/^AuthKey_([A-Z0-9]+)\.p8$/i)
    if (m) out.push({ keyId: m[1].toUpperCase(), path: path.join(DOWNLOADS, f) })
  }
  return out
}

function signJWT(privateKey: string, keyId: string): string {
  return jwt.sign({ iss: TEAM_ID, iat: Math.floor(Date.now() / 1000) }, privateKey, {
    algorithm: 'ES256',
    header: { kid: keyId, alg: 'ES256' },
  })
}

async function probe(host: string, token: string, jwtStr: string): Promise<{ status: number; reason?: string }> {
  return new Promise((resolve) => {
    const client = http2.connect(host)
    client.on('error', (e) => {
      client.close()
      resolve({ status: 0, reason: e.message })
    })
    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${token}`,
      authorization: `bearer ${jwtStr}`,
      'apns-topic': BUNDLE_ID,
      'apns-push-type': 'alert',
    })
    let body = ''
    let status = 0
    req.on('response', (h) => (status = h[':status'] as number))
    req.on('data', (c: Buffer) => (body += c.toString()))
    req.on('end', () => {
      client.close()
      let reason: string | undefined
      try {
        reason = JSON.parse(body).reason
      } catch {}
      resolve({ status, reason })
    })
    req.write(JSON.stringify({ aps: { alert: 'probe' } }))
    req.end()
  })
}

async function main() {
  if (!TEAM_ID) {
    console.error('APNS_TEAM_ID missing from env'); process.exit(1)
  }
  console.log(`Team ID: ${TEAM_ID}`)
  console.log(`Bundle:  ${BUNDLE_ID}`)
  console.log('')

  const keys = listKeys()
  if (keys.length === 0) {
    console.error(`No AuthKey_*.p8 files found in ${DOWNLOADS}`); process.exit(1)
  }
  console.log(`Found ${keys.length} .p8 file(s):\n${keys.map(k => '  ' + k.keyId).join('\n')}\n`)

  for (const key of keys) {
    const pem = fs.readFileSync(key.path, 'utf8')
    let jwtStr: string
    try {
      jwtStr = signJWT(pem, key.keyId)
    } catch (e) {
      console.log(`${key.keyId.padEnd(12)} ❌ JWT sign failed: ${(e as Error).message}`)
      continue
    }
    const prod = await probe(HOSTS.production, DUMMY_TOKEN, jwtStr)
    const sand = await probe(HOSTS.sandbox, DUMMY_TOKEN, jwtStr)
    const verdict = (r: { reason?: string }) =>
      r.reason === 'BadDeviceToken' ? '✅ JWT valid (BadDeviceToken)' :
      r.reason === 'InvalidProviderToken' ? '❌ JWT REJECTED (InvalidProviderToken)' :
      `? ${r.reason || 'unknown'}`
    console.log(`${key.keyId.padEnd(12)} prod: ${verdict(prod)}  |  sand: ${verdict(sand)}`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })

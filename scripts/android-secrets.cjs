/**
 * Encodes the two Android secrets for Codemagic, WITHOUT printing them.
 *
 * Both values have to reach Codemagic as single-line base64. The obvious way
 * is `base64 -w0 upload.jks`, which dumps your signing key into the terminal
 * — into scrollback, into any session transcript, and into the clipboard
 * history of whatever you paste through. The keystore is the one secret in
 * this project that cannot be rotated quietly: Play ties the app to it, and a
 * leaked upload key means asking Google to reset it.
 *
 * So this writes each value to a file next to the source and prints only the
 * path and the byte count. Open the file, copy it into the Codemagic variable,
 * then delete it.
 *
 *   node scripts/android-secrets.cjs
 *
 * Nothing here is committed: *.b64 is gitignored alongside the keystore.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')

const SECRETS = [
  {
    file: path.join(ROOT, 'android', 'upload.jks'),
    variable: 'VOXU_KEYSTORE',
    missing: [
      'Generate it first (you pick the passwords — do not let anyone else):',
      '',
      '  cd android',
      '  keytool -genkey -v -keystore upload.jks -keyalg RSA -keysize 2048 \\',
      '    -validity 10000 -alias voxu-upload',
      '',
      'keytool comes with a JDK. If it is not on PATH:',
      '  winget install EclipseAdoptium.Temurin.21.JDK',
      '',
      'Then BACK THE FILE UP somewhere that is not this machine. Play ties the',
      'app to this key permanently.',
    ],
  },
  {
    file: path.join(ROOT, 'android', 'app', 'google-services.json'),
    variable: 'GOOGLE_SERVICES_JSON',
    missing: [
      'Download it from Firebase Console:',
      '  Project settings -> Your apps -> Add app -> Android',
      '  Package name: com.voxu.app',
      'Save it to android/app/google-services.json',
      '',
      'This one is NOT a secret — it ships inside the APK and its key is',
      'restricted to the package name — so you can just commit it instead of',
      'using the Codemagic variable.',
    ],
  },
]

let missingAny = false

for (const secret of SECRETS) {
  const rel = path.relative(ROOT, secret.file).replace(/\\/g, '/')
  if (!fs.existsSync(secret.file)) {
    missingAny = true
    console.log(`\n✗ ${secret.variable}  — ${rel} not found`)
    for (const line of secret.missing) console.log('    ' + line)
    continue
  }

  const buf = fs.readFileSync(secret.file)
  const out = secret.file + '.b64'
  fs.writeFileSync(out, buf.toString('base64'), 'utf8')
  const outRel = path.relative(ROOT, out).replace(/\\/g, '/')
  console.log(`\n✓ ${secret.variable}`)
  console.log(`    source: ${rel} (${buf.length} bytes)`)
  console.log(`    base64: ${outRel} (${fs.statSync(out).size} chars) — open it, copy it, then delete it`)
}

console.log(`
Codemagic: the app -> Settings -> Environment variables. Add each variable
with group name "google_play" and Secure ticked. The workflow declares that
group, so a missing group fails the build before any step runs — which is the
error you get if you skip this.

  VOXU_KEYSTORE           (the .b64 file above)
  VOXU_KEYSTORE_PASSWORD  (what you typed into keytool)
  VOXU_KEY_ALIAS          voxu-upload
  VOXU_KEY_PASSWORD       (the key password; same as the store password
                           unless you deliberately set a different one)
  GOOGLE_SERVICES_JSON    (the .b64 file above, or commit the json instead)
`)

if (missingAny) {
  console.log('Not ready to build yet — see the ✗ entries above.')
  process.exit(1)
}
console.log('Both secrets encoded. Delete the .b64 files once they are pasted.')

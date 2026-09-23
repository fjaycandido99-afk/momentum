/**
 * Is the Android build ready to run, and what is still missing?
 *
 *   node scripts/android-secrets.cjs
 *
 * The keystore no longer passes through this script. It used to be base64'd
 * into a Codemagic variable group, which failed the build at startup
 * ("references to unknown variable group(s)") and meant pushing a signing key
 * through a clipboard. The workflow now declares `android_signing:
 * [voxu_upload]` and Codemagic supplies CM_KEYSTORE_PATH and friends itself,
 * so the key is uploaded once in the UI and never encoded by hand.
 *
 * google-services.json still has two routes, so it is checked here.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const rel = p => path.relative(ROOT, p).replace(/\\/g, '/')

const KEYSTORE = path.join(ROOT, 'android', 'upload.jks')
const KEY_PROPS = path.join(ROOT, 'android', 'key.properties')
const SERVICES = path.join(ROOT, 'android', 'app', 'google-services.json')

let blocked = 0

console.log('\n--- Codemagic (the CI build) ---\n')

console.log('1. Upload the keystore ONCE, in Codemagic:')
console.log('     Code signing identities -> Android keystores')
console.log('     Reference name: voxu_upload   <- must match exactly')
console.log('   Nothing to encode, and no variable group. The workflow reads')
console.log('   the CM_KEYSTORE_* variables Codemagic sets from that upload.\n')

if (fs.existsSync(SERVICES) && fs.statSync(SERVICES).size > 0) {
  const committed = require('child_process')
    .execSync('git ls-files --error-unmatch ' + JSON.stringify(rel(SERVICES)) + ' 2>nul || echo MISSING', {
      cwd: ROOT,
      shell: true,
    })
    .toString()
    .includes('google-services.json')
  console.log(`2. google-services.json: present (${fs.statSync(SERVICES).size} bytes)`)
  if (committed) {
    console.log('   Committed to git, so CI will find it. Nothing else to do.\n')
  } else {
    console.log('   NOT committed — CI will not see it. Either:')
    console.log('     git add -f android/app/google-services.json     (simplest;')
    console.log('       it is not a secret, it ships inside the APK)')
    console.log('   or set GOOGLE_SERVICES_JSON in Codemagic to this base64:')
    const out = SERVICES + '.b64'
    fs.writeFileSync(out, fs.readFileSync(SERVICES).toString('base64'), 'utf8')
    console.log(`     ${rel(out)} — open it, copy it, then delete it\n`)
  }
} else {
  blocked++
  console.log('2. google-services.json: MISSING  <- blocks the build')
  console.log('   Firebase Console -> Project settings -> Your apps -> Add app')
  console.log('   -> Android -> package name com.voxu.app -> download')
  console.log(`   Save to ${rel(SERVICES)}`)
  console.log('   Then commit it: git add -f android/app/google-services.json')
  console.log('   (Not a secret: it ships inside the APK and its key is')
  console.log('    restricted to the package name.)\n')
}

console.log('--- Building locally (optional) ---\n')

if (fs.existsSync(KEY_PROPS)) {
  console.log(`key.properties: present (${rel(KEY_PROPS)})`)
} else if (fs.existsSync(KEYSTORE)) {
  console.log(`upload.jks present, but ${rel(KEY_PROPS)} is not. Create it:`)
  console.log('   storeFile=' + KEYSTORE.replace(/\\/g, '/'))
  console.log('   storePassword=...')
  console.log('   keyAlias=voxu-upload')
  console.log('   keyPassword=...')
} else {
  console.log('No local keystore. Only needed to build a signed release on this')
  console.log('machine — CI does not use it. To make one (you pick the passwords):')
  console.log('   winget install EclipseAdoptium.Temurin.21.JDK   # no JDK here yet')
  console.log('   cd android')
  console.log('   keytool -genkey -v -keystore upload.jks -keyalg RSA -keysize 2048 \\')
  console.log('     -validity 10000 -alias voxu-upload')
  console.log('   Then BACK IT UP off this machine — Play ties the app to this key.')
}

console.log(
  blocked
    ? '\nNot ready: ' + blocked + ' thing(s) blocking the build.\n'
    : '\nNothing blocking the CI build, assuming the voxu_upload keystore is uploaded.\n',
)
process.exit(blocked ? 1 : 0)

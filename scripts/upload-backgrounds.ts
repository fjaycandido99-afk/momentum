/**
 * Batch Upload Backgrounds to Supabase Storage
 *
 * Usage:
 *   npx ts-node scripts/upload-backgrounds.ts <genre> <folder-path>
 *
 * Example:
 *   npx ts-node scripts/upload-backgrounds.ts lofi ./my-lofi-images
 *   npx ts-node scripts/upload-backgrounds.ts piano "C:\Users\fjayc\Pictures\piano-backgrounds"
 *
 * Supported genres: lofi, piano, jazz, classical, ambient, study
 * Supported formats: .jpg, .jpeg, .png, .webp, .avif
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// ES module compatibility
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const BUCKET_NAME = 'backgrounds'
const VALID_GENRES = ['lofi', 'piano', 'jazz', 'classical', 'ambient', 'study']
const VALID_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif']

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function ensureBucketExists() {
  const { data: buckets } = await supabase.storage.listBuckets()

  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME)

  if (!bucketExists) {
    console.log(`Creating bucket: ${BUCKET_NAME}`)
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true, // Make images publicly accessible
      fileSizeLimit: 5 * 1024 * 1024, // 5MB limit per image
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    })

    if (error) {
      console.error('Failed to create bucket:', error)
      process.exit(1)
    }
    console.log('Bucket created successfully')
  } else {
    console.log(`Bucket "${BUCKET_NAME}" already exists`)
  }
}

async function uploadFile(filePath: string, genre: string, fileName: string): Promise<boolean> {
  try {
    const fileBuffer = fs.readFileSync(filePath)
    const ext = path.extname(fileName).toLowerCase()

    // Determine content type
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
    }

    const contentType = contentTypes[ext] || 'image/jpeg'
    const storagePath = `${genre}/${fileName}`

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true, // Overwrite if exists
      })

    if (error) {
      console.error(`  Failed: ${fileName} - ${error.message}`)
      return false
    }

    return true
  } catch (err: any) {
    console.error(`  Error: ${fileName} - ${err.message}`)
    return false
  }
}

async function uploadBackgrounds(genre: string, folderPath: string) {
  // Validate genre
  if (!VALID_GENRES.includes(genre)) {
    console.error(`Invalid genre: ${genre}`)
    console.error(`Valid genres: ${VALID_GENRES.join(', ')}`)
    process.exit(1)
  }

  // Validate folder exists
  if (!fs.existsSync(folderPath)) {
    console.error(`Folder not found: ${folderPath}`)
    process.exit(1)
  }

  // Ensure bucket exists
  await ensureBucketExists()

  // Get all image files
  const files = fs.readdirSync(folderPath)
    .filter(file => VALID_EXTENSIONS.includes(path.extname(file).toLowerCase()))

  if (files.length === 0) {
    console.error(`No image files found in: ${folderPath}`)
    console.error(`Supported formats: ${VALID_EXTENSIONS.join(', ')}`)
    process.exit(1)
  }

  console.log(`\nFound ${files.length} images to upload to "${genre}"`)
  console.log('Starting upload...\n')

  let successful = 0
  let failed = 0

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const filePath = path.join(folderPath, file)

    // Show progress
    process.stdout.write(`[${i + 1}/${files.length}] Uploading ${file}...`)

    const success = await uploadFile(filePath, genre, file)

    if (success) {
      successful++
      console.log(' ✓')
    } else {
      failed++
    }

    // Small delay to avoid rate limiting
    if (i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  console.log('\n========== Upload Complete ==========')
  console.log(`Genre: ${genre}`)
  console.log(`Successful: ${successful}`)
  console.log(`Failed: ${failed}`)
  console.log(`Total: ${files.length}`)

  if (successful > 0) {
    const sampleUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${genre}/${files[0]}`
    console.log(`\nSample URL: ${sampleUrl}`)
  }
}

// Main execution
const args = process.argv.slice(2)

if (args.length < 2) {
  console.log(`
Batch Upload Backgrounds to Supabase Storage

Usage:
  npx ts-node scripts/upload-backgrounds.ts <genre> <folder-path>

Arguments:
  genre       One of: ${VALID_GENRES.join(', ')}
  folder-path Path to folder containing images

Examples:
  npx ts-node scripts/upload-backgrounds.ts lofi ./lofi-images
  npx ts-node scripts/upload-backgrounds.ts piano "C:\\Users\\fjayc\\Pictures\\piano"

Supported image formats: ${VALID_EXTENSIONS.join(', ')}
  `)
  process.exit(1)
}

const [genre, folderPath] = args

uploadBackgrounds(genre, folderPath)
  .catch(err => {
    console.error('Upload failed:', err)
    process.exit(1)
  })

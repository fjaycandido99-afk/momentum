/**
 * Clear all images from a genre folder in Supabase Storage
 * Usage: npx ts-node scripts/clear-genre.ts <genre>
 */

import { createClient } from '@supabase/supabase-js'
import * as path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function clearGenre(genre: string) {
  console.log(`Clearing all images from "${genre}"...`)

  const { data: files, error: listError } = await supabase.storage
    .from('backgrounds')
    .list(genre, { limit: 500 })

  if (listError) {
    console.error('Error listing files:', listError)
    return
  }

  if (!files || files.length === 0) {
    console.log('No files to delete')
    return
  }

  const filePaths = files.map(f => `${genre}/${f.name}`)
  console.log(`Found ${filePaths.length} files to delete`)

  const { error: deleteError } = await supabase.storage
    .from('backgrounds')
    .remove(filePaths)

  if (deleteError) {
    console.error('Error deleting files:', deleteError)
  } else {
    console.log(`Deleted ${filePaths.length} files from "${genre}"`)
  }
}

const genre = process.argv[2]
if (!genre) {
  console.log('Usage: npx ts-node scripts/clear-genre.ts <genre>')
  process.exit(1)
}

clearGenre(genre)

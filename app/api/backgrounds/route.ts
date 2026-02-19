import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const BACKGROUND_BUCKET = 'backgrounds'

// Use service role for listing public storage (anon key can't list by default)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const VALID_GENRES = ['lofi', 'piano', 'jazz', 'classical', 'ambient', 'study', 'sleep', 'rain']

/**
 * GET /api/backgrounds?genre=lofi
 * List all background images for a genre
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const genre = searchParams.get('genre')

    if (!genre || !VALID_GENRES.includes(genre)) {
      return NextResponse.json(
        { error: 'Invalid genre. Use: lofi, piano, jazz, classical, ambient, study, sleep, rain' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .storage
      .from(BACKGROUND_BUCKET)
      .list(genre, {
        limit: 200,
        sortBy: { column: 'name', order: 'asc' },
      })

    if (error) {
      console.error('Error listing backgrounds:', error)
      return NextResponse.json({ error: 'Failed to list backgrounds' }, { status: 500 })
    }

    // Filter for images and build URLs
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif']
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    const images = data
      .filter(file => imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext)))
      .map(file => ({
        name: file.name,
        // URL-encode the filename to handle spaces and special characters
        url: `${supabaseUrl}/storage/v1/object/public/${BACKGROUND_BUCKET}/${genre}/${encodeURIComponent(file.name)}`,
        size: file.metadata?.size,
      }))

    return NextResponse.json({
      genre,
      count: images.length,
      images,
    })
  } catch (error) {
    console.error('Backgrounds API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

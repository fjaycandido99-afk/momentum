import { NextResponse } from 'next/server'

/**
 * Apple's file for "links that open the app": voxu.app/join/… (a friend's
 * era) and voxu.app/i/… (an invite) open Voxu when it's installed, instead
 * of Safari — so the link, and the credit, reach the app. Only those paths:
 * the rest of the site stays in the browser. Served at
 * /.well-known/apple-app-site-association as JSON, no redirect.
 */
export const dynamic = 'force-static'

const APP_ID = 'FX8T7ASYCL.com.voxu.app'

export function GET() {
  return NextResponse.json({
    applinks: {
      details: [{ appIDs: [APP_ID], components: [{ '/': '/join/*' }, { '/': '/i/*' }] }],
    },
  })
}

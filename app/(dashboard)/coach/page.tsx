/**
 * /coach → redirect to /journal?mode=chat
 *
 * The standalone Coach surface was merged into Journal's Chat mode per
 * user direction — one chat home instead of two near-identical surfaces.
 * Anyone landing on /coach (bookmarks, old links, push deep-links) gets
 * silently rerouted so they don't hit a 404.
 *
 * The legacy Coach implementation (CoachingPlans, plan progress, ongoing
 * conversation list) is preserved at page.legacy.tsx.bak in this folder
 * — restore by renaming back to page.tsx if we ever want to bring the
 * standalone Coach surface back.
 */

import { redirect } from 'next/navigation'

export default function CoachRedirect() {
  redirect('/journal?mode=chat')
}

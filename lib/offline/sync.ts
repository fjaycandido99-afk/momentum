import {
  getUnsyncedJournalEntries,
  markJournalSynced,
  getPendingActions,
  clearPendingAction,
} from './db'

export async function syncOfflineData(): Promise<{ synced: number; failed: number }> {
  let synced = 0
  let failed = 0

  // 1. Sync unsynced journal entries
  try {
    const unsyncedEntries = await getUnsyncedJournalEntries()
    for (const entry of unsyncedEntries) {
      try {
        const res = await fetch('/api/daily-guide/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: entry.content,
            mood: entry.mood,
            offlineId: entry.id,
          }),
        })
        if (res.ok) {
          await markJournalSynced(entry.id)
          synced++
        } else {
          failed++
        }
      } catch {
        failed++
      }
    }
  } catch (err) {
    console.error('Error syncing journal entries:', err)
  }

  // 2. Replay pending actions
  try {
    const actions = await getPendingActions()
    for (const action of actions) {
      try {
        const res = await fetch(action.url, {
          method: action.method,
          headers: action.body ? { 'Content-Type': 'application/json' } : undefined,
          body: action.body ? JSON.stringify(action.body) : undefined,
        })
        if (res.ok) {
          await clearPendingAction(action.id!)
          synced++
        } else {
          failed++
        }
      } catch {
        failed++
      }
    }
  } catch (err) {
    console.error('Error replaying pending actions:', err)
  }

  return { synced, failed }
}

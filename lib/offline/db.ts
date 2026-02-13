import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

interface VoxuDB extends DBSchema {
  journal: {
    key: string
    value: {
      id: string
      content: string
      mood?: string
      createdAt: string
      synced: boolean
    }
    indexes: { 'by-date': string }
  }
  dailyGuide: {
    key: string
    value: {
      id: string
      date: string
      data: any
      cachedAt: string
    }
  }
  favorites: {
    key: string
    value: {
      id: string
      type: 'soundscape' | 'music' | 'motivation'
      youtubeId: string
      label: string
      savedAt: string
    }
  }
  pendingActions: {
    key: number
    value: {
      id?: number
      action: string
      url: string
      method: string
      body?: any
      createdAt: string
    }
    indexes: { 'by-date': string }
  }
}

const DB_NAME = 'voxu-offline'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<VoxuDB>> | null = null

export function getDB(): Promise<IDBPDatabase<VoxuDB>> {
  if (!dbPromise) {
    dbPromise = openDB<VoxuDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Journal entries
        if (!db.objectStoreNames.contains('journal')) {
          const journalStore = db.createObjectStore('journal', { keyPath: 'id' })
          journalStore.createIndex('by-date', 'createdAt')
        }

        // Daily guide cache
        if (!db.objectStoreNames.contains('dailyGuide')) {
          db.createObjectStore('dailyGuide', { keyPath: 'id' })
        }

        // Favorites
        if (!db.objectStoreNames.contains('favorites')) {
          db.createObjectStore('favorites', { keyPath: 'id' })
        }

        // Pending actions queue
        if (!db.objectStoreNames.contains('pendingActions')) {
          const actionsStore = db.createObjectStore('pendingActions', {
            keyPath: 'id',
            autoIncrement: true,
          })
          actionsStore.createIndex('by-date', 'createdAt')
        }
      },
    })
  }
  return dbPromise
}

// --- Journal helpers ---
export async function saveJournalOffline(entry: VoxuDB['journal']['value']) {
  const db = await getDB()
  await db.put('journal', entry)
}

export async function getOfflineJournalEntries() {
  const db = await getDB()
  return db.getAllFromIndex('journal', 'by-date')
}

export async function getUnsyncedJournalEntries() {
  const db = await getDB()
  const all = await db.getAll('journal')
  return all.filter(e => !e.synced)
}

export async function markJournalSynced(id: string) {
  const db = await getDB()
  const entry = await db.get('journal', id)
  if (entry) {
    entry.synced = true
    await db.put('journal', entry)
  }
}

// --- Daily guide cache ---
export async function cacheDailyGuide(date: string, data: any) {
  const db = await getDB()
  await db.put('dailyGuide', {
    id: date,
    date,
    data,
    cachedAt: new Date().toISOString(),
  })
}

export async function getCachedDailyGuide(date: string) {
  const db = await getDB()
  return db.get('dailyGuide', date)
}

// --- Pending actions queue ---
export async function queueAction(action: Omit<VoxuDB['pendingActions']['value'], 'id' | 'createdAt'>) {
  const db = await getDB()
  await db.add('pendingActions', {
    ...action,
    createdAt: new Date().toISOString(),
  })
}

export async function getPendingActions() {
  const db = await getDB()
  return db.getAllFromIndex('pendingActions', 'by-date')
}

export async function clearPendingAction(id: number) {
  const db = await getDB()
  await db.delete('pendingActions', id)
}

export async function clearAllPendingActions() {
  const db = await getDB()
  await db.clear('pendingActions')
}

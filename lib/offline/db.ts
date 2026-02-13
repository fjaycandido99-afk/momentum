const DB_NAME = 'voxu-offline'
const DB_VERSION = 1

interface JournalEntry {
  id: string
  content: string
  mood?: string
  createdAt: string
  synced: boolean
}

interface PendingAction {
  id?: number
  action: string
  url: string
  method: string
  body?: any
  createdAt: string
}

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('journal')) {
        const s = db.createObjectStore('journal', { keyPath: 'id' })
        s.createIndex('by-date', 'createdAt')
      }
      if (!db.objectStoreNames.contains('dailyGuide')) {
        db.createObjectStore('dailyGuide', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('favorites')) {
        db.createObjectStore('favorites', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('pendingActions')) {
        const s = db.createObjectStore('pendingActions', { keyPath: 'id', autoIncrement: true })
        s.createIndex('by-date', 'createdAt')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function txGet<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  return getDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  }))
}

function txGetAll<T>(storeName: string): Promise<T[]> {
  return getDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).getAll()
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  }))
}

function txPut(storeName: string, value: any): Promise<void> {
  return getDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const req = tx.objectStore(storeName).put(value)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  }))
}

function txAdd(storeName: string, value: any): Promise<void> {
  return getDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const req = tx.objectStore(storeName).add(value)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  }))
}

function txDelete(storeName: string, key: IDBValidKey): Promise<void> {
  return getDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const req = tx.objectStore(storeName).delete(key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  }))
}

function txClear(storeName: string): Promise<void> {
  return getDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const req = tx.objectStore(storeName).clear()
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  }))
}

// --- Journal helpers ---
export async function saveJournalOffline(entry: JournalEntry) {
  await txPut('journal', entry)
}

export async function getOfflineJournalEntries(): Promise<JournalEntry[]> {
  return txGetAll<JournalEntry>('journal')
}

export async function getUnsyncedJournalEntries(): Promise<JournalEntry[]> {
  const all = await txGetAll<JournalEntry>('journal')
  return all.filter(e => !e.synced)
}

export async function markJournalSynced(id: string) {
  const entry = await txGet<JournalEntry>('journal', id)
  if (entry) {
    entry.synced = true
    await txPut('journal', entry)
  }
}

// --- Daily guide cache ---
export async function cacheDailyGuide(date: string, data: any) {
  await txPut('dailyGuide', { id: date, date, data, cachedAt: new Date().toISOString() })
}

export async function getCachedDailyGuide(date: string) {
  return txGet('dailyGuide', date)
}

// --- Pending actions queue ---
export async function queueAction(action: Omit<PendingAction, 'id' | 'createdAt'>) {
  await txAdd('pendingActions', { ...action, createdAt: new Date().toISOString() })
}

export async function getPendingActions(): Promise<PendingAction[]> {
  return txGetAll<PendingAction>('pendingActions')
}

export async function clearPendingAction(id: number) {
  await txDelete('pendingActions', id)
}

export async function clearAllPendingActions() {
  await txClear('pendingActions')
}

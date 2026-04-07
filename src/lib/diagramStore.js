const API = '/api/diagrams'
const memoryCache = {}

export async function getDiagram(questionId) {
  if (memoryCache[questionId]) return memoryCache[questionId]
  try {
    const res = await fetch(`${API}/${encodeURIComponent(questionId)}`)
    if (!res.ok) return null
    const data = await res.json()
    memoryCache[questionId] = data
    return data
  } catch {
    return null
  }
}

export async function saveDiagram(questionId, data) {
  memoryCache[questionId] = data
  try {
    await fetch(`${API}/${encodeURIComponent(questionId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return true
  } catch {
    return false
  }
}

export async function getAllDiagramIds() {
  try {
    const res = await fetch(API)
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function clearAll() {
  Object.keys(memoryCache).forEach(k => delete memoryCache[k])
  try { await fetch(API, { method: 'DELETE' }) } catch {}
}

// Helper for migration: get all diagrams from old IndexedDB
export async function getAllDiagramsForMigration() {
  const DB_NAME = 'drivingApp_diagrams'
  const STORE_NAME = 'diagrams'
  try {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = (e) => {
        const db = e.target.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
      request.onsuccess = () => {
        const db = request.result
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const all = {}
        const cursor = store.openCursor()
        cursor.onsuccess = (e) => {
          const c = e.target.result
          if (c) {
            all[c.key] = c.value
            c.continue()
          } else {
            resolve(all)
          }
        }
        cursor.onerror = () => resolve({})
      }
      request.onerror = () => resolve({})
    })
  } catch {
    return {}
  }
}

// Keep old migration function as no-op (called from App.jsx, will be removed)
export async function migrateFromLocalStorage() {}

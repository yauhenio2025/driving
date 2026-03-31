const DB_NAME = 'drivingApp_diagrams'
const STORE_NAME = 'diagrams'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getDiagram(questionId) {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).get(questionId)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function saveDiagram(questionId, data) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const request = tx.objectStore(STORE_NAME).put(data, questionId)
      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
    })
  } catch {
    return false
  }
}

export async function getAllDiagramIds() {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).getAllKeys()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

export async function clearAll() {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch {
    // fallback: delete entire database
    indexedDB.deleteDatabase(DB_NAME)
  }
}

/**
 * One-time migration:
 * 1. Move diagram_* keys from localStorage to IndexedDB
 * 2. Extract embedded diagrams from existing favorites entries into IndexedDB
 * 3. Strip diagram field from favorites to free localStorage space
 */
export async function migrateFromLocalStorage() {
  const PREFIX = 'drivingApp_'
  const FLAG = PREFIX + 'diagramMigrated'
  if (localStorage.getItem(FLAG)) return

  // 1. Migrate diagram_* cache keys
  const keysToRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(PREFIX + 'diagram_')) {
      const questionId = key.slice((PREFIX + 'diagram_').length)
      try {
        const data = JSON.parse(localStorage.getItem(key))
        if (data?.image) {
          await saveDiagram(questionId, data)
          keysToRemove.push(key)
        }
      } catch { /* skip corrupted entries */ }
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k))

  // 2. Extract diagrams embedded in favorites, save to IndexedDB, strip from favorites
  try {
    const favsRaw = localStorage.getItem(PREFIX + 'favorites')
    if (favsRaw) {
      const favs = JSON.parse(favsRaw)
      let changed = false
      for (const fav of favs) {
        if (fav.diagram?.image) {
          await saveDiagram(fav.questionId, fav.diagram)
          delete fav.diagram
          changed = true
        }
      }
      if (changed) {
        localStorage.setItem(PREFIX + 'favorites', JSON.stringify(favs))
      }
    }
  } catch { /* skip if favorites are corrupted */ }

  localStorage.setItem(FLAG, '1')
}

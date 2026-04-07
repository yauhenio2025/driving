const API = '/api/store'
let cache = {}
let ready = false

export async function init() {
  const res = await fetch(API)
  if (res.ok) cache = await res.json()
  ready = true
}

export function isReady() { return ready }

export function get(key) {
  return cache[key] ?? null
}

export function set(key, value) {
  cache[key] = value
  fetch(`${API}/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value })
  }).catch(err => console.error('Storage sync error:', err))
}

export function update(key, fn) {
  const current = get(key)
  set(key, fn(current))
}

export function remove(key) {
  delete cache[key]
  fetch(`${API}/${encodeURIComponent(key)}`, { method: 'DELETE' })
    .catch(err => console.error('Storage delete error:', err))
}

export async function exportAll() {
  const res = await fetch('/api/export')
  if (res.ok) return res.json()
  return { store: cache, diagrams: {} }
}

export async function importAll(data) {
  // data may be old-format (flat kv) or new-format { store, diagrams }
  const storeData = data.store || data
  const diagrams = data.diagrams || {}
  await fetch('/api/migrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ store: storeData, diagrams })
  })
  // Refresh cache
  await init()
}

export async function clearAll() {
  cache = {}
  await fetch(API, { method: 'DELETE' })
  await fetch('/api/diagrams', { method: 'DELETE' })
}

// Migration: detect localStorage data and push to server
export async function migrateFromBrowser() {
  const PREFIX = 'drivingApp_'
  const hasLocal = Object.keys(cache).length === 0 // server is empty

  // Check if browser has data
  let browserData = {}
  let hasBrowserData = false
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(PREFIX) && !k.endsWith('diagramMigrated')) {
      const shortKey = k.slice(PREFIX.length)
      try {
        browserData[shortKey] = JSON.parse(localStorage.getItem(k))
        hasBrowserData = true
      } catch {}
    }
  }

  if (!hasBrowserData || !hasLocal) return false

  // Also grab IndexedDB diagrams
  let diagrams = {}
  try {
    const { getAllDiagramsForMigration } = await import('./diagramStore')
    diagrams = await getAllDiagramsForMigration()
  } catch {}

  // Push to server
  await fetch('/api/migrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ store: browserData, diagrams })
  })

  // Refresh cache from server
  await init()

  // Clear browser storage
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i)
    if (k?.startsWith(PREFIX)) localStorage.removeItem(k)
  }
  try { indexedDB.deleteDatabase('drivingApp_diagrams') } catch {}

  return true // migration happened
}

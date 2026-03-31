const PREFIX = 'drivingApp_'

export function get(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function set(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value))
}

export function update(key, fn) {
  const current = get(key)
  set(key, fn(current))
}

export function exportAll() {
  const data = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k.startsWith(PREFIX)) {
      data[k.slice(PREFIX.length)] = get(k.slice(PREFIX.length))
    }
  }
  return data
}

export function importAll(data) {
  for (const [key, value] of Object.entries(data)) {
    set(key, value)
  }
}

export function clearAll() {
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k.startsWith(PREFIX)) keys.push(k)
  }
  keys.forEach(k => localStorage.removeItem(k))
  // Also clear IndexedDB diagram store
  indexedDB.deleteDatabase('drivingApp_diagrams')
}

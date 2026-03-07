import { useState, useCallback } from 'react'
import * as storage from '../lib/storage'

const DEFAULTS = {
  apiKey: '',
  sessionSize: 20,
  newCardsPerDay: 15,
  darkMode: false,
}

export function useSettings() {
  const [settings, setSettings] = useState(() => ({
    ...DEFAULTS,
    ...storage.get('settings'),
  }))

  const updateSettings = useCallback((updates) => {
    setSettings(prev => {
      const next = { ...prev, ...updates }
      storage.set('settings', next)
      return next
    })
  }, [])

  return { settings, updateSettings }
}

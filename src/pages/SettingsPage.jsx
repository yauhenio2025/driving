import { useState } from 'react'
import { useSettings } from '../hooks/useSettings'
import * as storage from '../lib/storage'
import { testApiKey } from '../lib/gemini'

export function SettingsPage({ darkMode, setDarkMode }) {
  const { settings, updateSettings } = useSettings()
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [showConfirmReset, setShowConfirmReset] = useState(false)

  const handleTestKey = async () => {
    if (!settings.apiKey) return
    setTesting(true)
    setTestResult(null)
    try {
      const ok = await testApiKey(settings.apiKey)
      setTestResult(ok ? 'valid' : 'invalid')
    } catch {
      setTestResult('error')
    }
    setTesting(false)
  }

  const handleExport = () => {
    const data = storage.exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `driving-app-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        storage.importAll(data)
        window.location.reload()
      } catch {
        alert('Invalid backup file')
      }
    }
    reader.readAsText(file)
  }

  const handleReset = () => {
    storage.clearAll()
    window.location.reload()
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Settings</h1>

      {/* API Key */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Gemini API Key</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">Used for AI-powered explanations when you answer wrong</p>
        <div className="flex gap-2">
          <input
            type="password"
            value={settings.apiKey}
            onChange={(e) => { updateSettings({ apiKey: e.target.value }); setTestResult(null) }}
            placeholder="Enter API key..."
            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
          />
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
            onClick={handleTestKey}
            disabled={!settings.apiKey || testing}
          >
            {testing ? '...' : 'Test'}
          </button>
        </div>
        {testResult === 'valid' && <p className="text-emerald-500 text-sm mt-2">API key is valid!</p>}
        {testResult === 'invalid' && <p className="text-rose-500 text-sm mt-2">Invalid API key</p>}
        {testResult === 'error' && <p className="text-rose-500 text-sm mt-2">Connection error</p>}
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">API key is stored in browser localStorage</p>
      </div>

      {/* Session settings */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Study Settings</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600 dark:text-slate-400">Session size</span>
              <span className="text-slate-900 dark:text-white font-medium">{settings.sessionSize}</span>
            </div>
            <input
              type="range" min="10" max="50" value={settings.sessionSize}
              onChange={(e) => updateSettings({ sessionSize: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600 dark:text-slate-400">New cards per session</span>
              <span className="text-slate-900 dark:text-white font-medium">{settings.newCardsPerDay}</span>
            </div>
            <input
              type="range" min="5" max="30" value={settings.newCardsPerDay}
              onChange={(e) => updateSettings({ newCardsPerDay: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Appearance</h3>
        <button
          className="flex items-center justify-between cursor-pointer w-full"
          onClick={() => setDarkMode(!darkMode)}
        >
          <span className="text-slate-600 dark:text-slate-400">Dark mode</span>
          <div className={`w-11 h-6 rounded-full relative transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}>
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-5' : ''}`} />
          </div>
        </button>
      </div>

      {/* Data management */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Data</h3>
        <div className="space-y-3">
          <button className="w-full py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-700" onClick={handleExport}>
            Export Backup
          </button>
          <label className="block w-full py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-center">
            Import Backup
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          {!showConfirmReset ? (
            <button className="w-full py-2 px-4 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm hover:bg-rose-50 dark:hover:bg-rose-900/20" onClick={() => setShowConfirmReset(true)}>
              Reset All Progress
            </button>
          ) : (
            <div className="flex gap-2">
              <button className="flex-1 py-2 px-4 rounded-lg bg-rose-500 text-white text-sm" onClick={handleReset}>
                Confirm Reset
              </button>
              <button className="flex-1 py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 text-sm" onClick={() => setShowConfirmReset(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

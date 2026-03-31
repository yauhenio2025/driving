import { useState, useEffect, useMemo } from 'react'
import { StudyPage } from './pages/StudyPage'
import { CategoryPage } from './pages/CategoryPage'
import { TestSimulationPage } from './components/test/TestSimulation'
import { AnalyticsDashboard } from './components/analytics/Dashboard'
import { WeakAreasPage } from './pages/WeakAreasPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { GalleryPage } from './pages/GalleryPage'
import { SettingsPage } from './pages/SettingsPage'
import * as storage from './lib/storage'
import { migrateFromLocalStorage } from './lib/diagramStore'
import { computeStudyStreak, computeMasteryProgress } from './lib/stats'
import { questions } from './data/questions'

const NAV_ITEMS = [
  { key: 'study', label: 'Study', icon: '&#128218;' },
  { key: 'categories', label: 'Categories', icon: '&#128193;' },
  { key: 'test', label: 'Test', icon: '&#128221;' },
  { key: 'analytics', label: 'Analytics', icon: '&#128202;' },
  { key: 'weak', label: 'Weak Areas', icon: '&#127919;' },
  { key: 'favorites', label: 'Favorites', icon: '&#9733;' },
  { key: 'gallery', label: 'Gallery', icon: '&#128444;' },
  { key: 'settings', label: 'Settings', icon: '&#9881;' },
]

function useRoute() {
  const [route, setRoute] = useState(() => window.location.hash.slice(2) || 'study')

  useEffect(() => {
    const handler = () => setRoute(window.location.hash.slice(2) || 'study')
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  const navigate = (r) => { window.location.hash = `#/${r}` }
  return { route, navigate }
}

export default function App() {
  const { route, navigate } = useRoute()
  const [darkMode, setDarkMode] = useState(() => storage.get('settings')?.darkMode ?? false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    storage.update('settings', (s) => ({ ...(s || {}), darkMode }))
  }, [darkMode])

  // Migrate diagram storage from localStorage to IndexedDB (runs once)
  useEffect(() => { migrateFromLocalStorage() }, [])

  const quickStats = useMemo(() => {
    const log = storage.get('answerLog') || []
    const cards = storage.get('srsCards') || {}
    return {
      streak: computeStudyStreak(log),
      mastery: computeMasteryProgress(cards, questions.length),
    }
  }, [route])

  const renderPage = () => {
    switch (route) {
      case 'study': return <StudyPage />
      case 'categories': return <CategoryPage />
      case 'test': return <TestSimulationPage />
      case 'analytics': return <AnalyticsDashboard onNavigate={navigate} />
      case 'weak': return <WeakAreasPage />
      case 'favorites': return <FavoritesPage />
      case 'gallery': return <GalleryPage />
      case 'settings': return <SettingsPage darkMode={darkMode} setDarkMode={setDarkMode} />
      default: return <StudyPage />
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-60 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex-col z-40">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Chinese Driving</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Subject 1 - 971 questions</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-3 ${
                route === item.key
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
              onClick={() => navigate(item.key)}
            >
              <span dangerouslySetInnerHTML={{ __html: item.icon }} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Mastered: {quickStats.mastery.mastered}/{questions.length}</span>
            <span>Streak: {quickStats.streak}d</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="md:ml-60 min-h-screen pb-20 md:pb-8">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {renderPage()}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex z-40">
        {NAV_ITEMS.filter(i => ['study', 'categories', 'test', 'favorites', 'gallery'].includes(i.key)).map(item => (
          <button
            key={item.key}
            className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-medium transition ${
              route === item.key
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-400 dark:text-slate-500'
            }`}
            onClick={() => navigate(item.key)}
          >
            <span dangerouslySetInnerHTML={{ __html: item.icon }} className="text-lg" />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

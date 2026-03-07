import { useState, useMemo } from 'react'
import { StudySession } from '../components/study/StudySession'
import { useSRS } from '../hooks/useSRS'
import { computeWeakCategories } from '../lib/stats'
import * as storage from '../lib/storage'

export function WeakAreasPage() {
  const { reviewCard, buildWeakSession } = useSRS()
  const [sessionIds, setSessionIds] = useState(null)

  const weakCategories = useMemo(() => {
    const log = storage.get('answerLog') || []
    return computeWeakCategories(log, 5)
  }, [sessionIds])

  const startDrill = () => {
    const names = weakCategories.map(w => w.name)
    const ids = buildWeakSession(names)
    setSessionIds(ids)
  }

  if (sessionIds) {
    return (
      <StudySession
        questionIds={sessionIds}
        reviewCard={reviewCard}
        onComplete={() => setSessionIds(null)}
        title="Weak Areas Drill"
        mode="weak"
      />
    )
  }

  if (weakCategories.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No Weak Areas</h2>
        <p className="text-slate-500 dark:text-slate-400">Answer at least 5 questions in a category to identify weak areas.</p>
      </div>
    )
  }

  return (
    <div className="text-center py-12">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Weak Areas</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-8">Target your lowest-performing categories</p>
      <div className="max-w-sm mx-auto mb-8 space-y-3">
        {weakCategories.map(w => (
          <div key={w.name} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
            <span className="text-slate-700 dark:text-slate-300 text-sm">{w.name}</span>
            <span className="text-rose-500 font-bold">{Math.round(w.rate * 100)}%</span>
          </div>
        ))}
      </div>
      <button
        className="px-8 py-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition font-semibold text-lg"
        onClick={startDrill}
      >
        Drill Weak Areas
      </button>
    </div>
  )
}

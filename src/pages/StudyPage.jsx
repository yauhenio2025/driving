import { useState } from 'react'
import { StudySession } from '../components/study/StudySession'
import { useSRS } from '../hooks/useSRS'

export function StudyPage() {
  const { reviewCard, buildSession, dueCards, newCardIds, totalMastered } = useSRS()
  const [sessionIds, setSessionIds] = useState(null)

  const startSession = () => {
    const ids = buildSession()
    setSessionIds(ids)
  }

  if (sessionIds) {
    return (
      <StudySession
        questionIds={sessionIds}
        reviewCard={reviewCard}
        onComplete={() => setSessionIds(null)}
        title="SRS Study Session"
        mode="study"
      />
    )
  }

  return (
    <div className="text-center py-12">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Study Mode</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
        Spaced repetition helps you memorize efficiently. Cards you get wrong appear more often,
        while mastered cards appear less frequently.
      </p>
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mx-auto mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-rose-500">{dueCards.length}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Due</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-indigo-500">{newCardIds.length}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">New</div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-emerald-500">{totalMastered}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Mastered</div>
        </div>
      </div>
      <button
        className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-lg shadow-lg shadow-indigo-200 dark:shadow-none"
        onClick={startSession}
      >
        Start Study Session
      </button>
    </div>
  )
}

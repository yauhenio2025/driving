import { useState } from 'react'
import { getQuestion, getImagePath } from '../data/questions'
import { Badge } from '../components/shared/Badge'
import { Markdown } from '../components/shared/Markdown'
import * as storage from '../lib/storage'

export function FavoritesPage() {
  const [favorites, setFavorites] = useState(() => storage.get('favorites') || [])
  const [expanded, setExpanded] = useState(null)

  const remove = (questionId) => {
    storage.update('favorites', (favs) => (favs || []).filter(f => f.questionId !== questionId))
    setFavorites(prev => prev.filter(f => f.questionId !== questionId))
    if (expanded === questionId) setExpanded(null)
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">&#9734;</div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No Favorites Yet</h2>
        <p className="text-slate-500 dark:text-slate-400">When you get an explanation you want to keep, hit the Save button to add it here.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Favorites</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">{favorites.length} saved</span>
      </div>
      <div className="space-y-4">
        {favorites.map(fav => {
          const q = getQuestion(fav.questionId)
          if (!q) return null
          const imgPath = getImagePath(q)
          const isExpanded = expanded === fav.questionId

          return (
            <div key={fav.questionId} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
              <button
                className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                onClick={() => setExpanded(isExpanded ? null : fav.questionId)}
              >
                <div className="flex items-start gap-3">
                  {imgPath && (
                    <img src={imgPath} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge color="blue">{q.category}</Badge>
                    </div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{q.text}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Your answer: <span className="text-rose-500">{fav.userAnswer}</span>
                      {' · '}
                      Correct: <span className="text-emerald-500">{fav.correctAnswer}</span>
                    </p>
                  </div>
                  <span className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    &#9660;
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4">
                  {imgPath && (
                    <img src={imgPath} alt="" className="rounded-lg max-h-48 mb-3" />
                  )}
                  <div className="space-y-2 mb-3">
                    {q.options.map((opt, i) => {
                      let cls = 'px-3 py-2 rounded-lg text-sm '
                      if (i === q.correct_index) cls += 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                      else if (opt === fav.userAnswer) cls += 'bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700'
                      else cls += 'text-slate-500 dark:text-slate-400'
                      return <div key={i} className={cls}>{i + 1}. {opt}</div>
                    })}
                  </div>

                  {fav.explanation && (
                    <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                      <h4 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-2">Explanation</h4>
                      <Markdown text={fav.explanation} className="text-slate-700 dark:text-slate-300" />
                    </div>
                  )}

                  <div className="flex justify-end mt-3">
                    <button
                      className="text-sm text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 font-medium"
                      onClick={(e) => { e.stopPropagation(); remove(fav.questionId) }}
                    >
                      Remove from favorites
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

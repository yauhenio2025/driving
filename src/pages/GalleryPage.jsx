import { useState } from 'react'
import { getQuestion, getImagePath } from '../data/questions'
import { Badge } from '../components/shared/Badge'
import { Markdown } from '../components/shared/Markdown'
import * as storage from '../lib/storage'

export function GalleryPage() {
  const [favorites, setFavorites] = useState(() => storage.get('favorites') || [])
  const [selected, setSelected] = useState(null)

  const withDiagrams = favorites.filter(f => f.diagram?.image)

  const remove = (questionId) => {
    storage.update('favorites', (favs) => (favs || []).filter(f => f.questionId !== questionId))
    setFavorites(prev => prev.filter(f => f.questionId !== questionId))
    if (selected?.questionId === questionId) setSelected(null)
  }

  if (withDiagrams.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">&#128444;</div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No Diagrams Yet</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          When you get a wrong answer with a visual aid, hit Save to add it here.
          Diagrams help you review tricky concepts visually.
        </p>
      </div>
    )
  }

  // Detail view
  if (selected) {
    const fav = selected
    const q = getQuestion(fav.questionId)
    if (!q) { setSelected(null); return null }
    const imgPath = getImagePath(q)

    return (
      <div className="fade-in">
        <button
          className="mb-4 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium flex items-center gap-1"
          onClick={() => setSelected(null)}
        >
          &larr; Back to Gallery
        </button>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
          {/* Diagram */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50">
            <img
              src={fav.diagram.image}
              alt="Visual explanation diagram"
              className="rounded-lg max-w-full mx-auto border border-slate-200 dark:border-slate-600"
            />
            {fav.diagram.caption && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic text-center">{fav.diagram.caption}</p>
            )}
          </div>

          {/* Question context */}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Badge color="blue">{q.category}</Badge>
            </div>

            <div className="flex items-start gap-4 mb-4">
              {imgPath && (
                <img src={imgPath} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
              )}
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{q.text}</h3>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2 mb-4">
              {q.options.map((opt, i) => {
                let cls = 'px-3 py-2 rounded-lg text-sm '
                if (i === q.correct_index) cls += 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                else if (opt === fav.userAnswer) cls += 'bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700'
                else cls += 'text-slate-500 dark:text-slate-400'
                return <div key={i} className={cls}>{i + 1}. {opt}</div>
              })}
            </div>

            {/* Explanation */}
            {fav.explanation && (
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 mb-4">
                <h4 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-2">Explanation</h4>
                <Markdown text={fav.explanation} className="text-slate-700 dark:text-slate-300" />
              </div>
            )}

            <div className="flex justify-end">
              <button
                className="text-sm text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 font-medium"
                onClick={() => { remove(fav.questionId); setSelected(null) }}
              >
                Remove from saved
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Grid view
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Diagram Gallery</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">{withDiagrams.length} diagrams</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {withDiagrams.map(fav => {
          const q = getQuestion(fav.questionId)
          if (!q) return null
          return (
            <button
              key={fav.questionId}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden text-left hover:ring-2 hover:ring-indigo-400 transition group"
              onClick={() => setSelected(fav)}
            >
              <div className="aspect-[4/3] overflow-hidden bg-slate-50 dark:bg-slate-900/50">
                <img
                  src={fav.diagram.image}
                  alt="Visual aid diagram"
                  className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-3">
                <Badge color="blue">{q.category}</Badge>
                <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2 mt-1">{q.text}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  <span className="text-rose-500">{fav.userAnswer}</span>
                  {' \u2192 '}
                  <span className="text-emerald-500">{fav.correctAnswer}</span>
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

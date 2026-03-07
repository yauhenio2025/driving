import { useState, useMemo } from 'react'
import { categories, questionsByCategory } from '../data/questions'
import { StudySession } from '../components/study/StudySession'
import { useSRS } from '../hooks/useSRS'
import { shuffleArray } from '../lib/utils'
import * as storage from '../lib/storage'
import { computeCategoryAccuracy } from '../lib/stats'

export function CategoryPage() {
  const [selectedCategory, setSelectedCategory] = useState(null)
  const { reviewCard } = useSRS()

  const catAccuracy = useMemo(() => {
    const log = storage.get('answerLog') || []
    return computeCategoryAccuracy(log)
  }, [selectedCategory]) // recompute when returning from practice

  const [categoryIds, setCategoryIds] = useState(null)

  const startCategory = (cat) => {
    const qs = questionsByCategory.get(cat) || []
    setCategoryIds(shuffleArray(qs.map(q => q.id)))
    setSelectedCategory(cat)
  }

  if (selectedCategory && categoryIds) {
    return (
      <StudySession
        questionIds={categoryIds}
        reviewCard={reviewCard}
        onComplete={() => { setSelectedCategory(null); setCategoryIds(null) }}
        title={selectedCategory}
        mode="category"
      />
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Categories</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => {
          const qs = questionsByCategory.get(cat) || []
          const acc = catAccuracy[cat]
          const rate = acc ? Math.round(acc.rate * 100) : null
          const rateColor = rate === null ? 'text-slate-400' : rate >= 90 ? 'text-emerald-500' : rate >= 70 ? 'text-amber-500' : 'text-rose-500'

          return (
            <button
              key={cat}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4 text-left hover:shadow-md transition group"
              onClick={() => startCategory(cat)}
            >
              <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                {cat}
              </h3>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {qs.length} questions
                </span>
                {rate !== null && (
                  <span className={`text-sm font-semibold ${rateColor}`}>
                    {rate}%
                  </span>
                )}
              </div>
              {acc && (
                <div className="mt-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${rate >= 90 ? 'bg-emerald-500' : rate >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${rate}%` }}
                  />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

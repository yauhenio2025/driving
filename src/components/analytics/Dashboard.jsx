import { useMemo } from 'react'
import * as storage from '../../lib/storage'
import { questions } from '../../data/questions'
import {
  computeCategoryAccuracy,
  computeDailyActivity,
  computeSRSDistribution,
  computeWeakCategories,
  computeMasteryProgress,
  computeStudyStreak,
} from '../../lib/stats'

function StatCard({ label, value, color = 'text-slate-900 dark:text-white' }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</div>
    </div>
  )
}

function CategoryChart({ catAccuracy, onCategoryClick }) {
  const sorted = Object.entries(catAccuracy)
    .filter(([, v]) => v.total > 0)
    .sort((a, b) => a[1].rate - b[1].rate)

  if (sorted.length === 0) return <p className="text-slate-400 text-sm">No data yet</p>

  return (
    <div className="space-y-2">
      {sorted.map(([name, stats]) => {
        const pct = Math.round(stats.rate * 100)
        const color = pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-rose-500'
        return (
          <button
            key={name}
            className="w-full text-left group"
            onClick={() => onCategoryClick?.(name)}
          >
            <div className="flex items-center justify-between text-sm mb-0.5">
              <span className="text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate mr-2">{name}</span>
              <span className="text-slate-500 dark:text-slate-400 tabular-nums">{pct}% ({stats.correct}/{stats.total})</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
          </button>
        )
      })}
    </div>
  )
}

function ActivityChart({ daily }) {
  const maxCount = Math.max(...daily.map(d => d.count), 1)
  return (
    <div className="flex items-end gap-0.5 h-16 sm:h-24">
      {daily.map((d, i) => {
        const h = d.count > 0 ? Math.max(4, (d.count / maxCount) * 96) : 0
        const correctRate = d.count > 0 ? d.correct / d.count : 0
        const color = correctRate >= 0.8 ? 'bg-emerald-500' : correctRate >= 0.6 ? 'bg-amber-500' : 'bg-rose-500'
        return (
          <div key={i} className="flex-1 flex flex-col justify-end items-center group relative">
            <div className={`w-full rounded-t ${d.count > 0 ? color : 'bg-slate-200 dark:bg-slate-700'}`} style={{ height: `${h}px` }} />
            <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
              {d.date}: {d.count} ({d.correct} correct)
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SRSDonut({ dist, total }) {
  const segments = [
    { label: 'Mature', count: dist.mature, color: 'bg-emerald-500' },
    { label: 'Young', count: dist.young, color: 'bg-indigo-500' },
    { label: 'Learning', count: dist.learning, color: 'bg-amber-500' },
    { label: 'New', count: total - dist.mature - dist.young - dist.learning, color: 'bg-slate-300 dark:bg-slate-600' },
  ]
  return (
    <div className="space-y-2">
      <div className="flex rounded-full h-4 overflow-hidden">
        {segments.map(s => (
          s.count > 0 && <div key={s.label} className={s.color} style={{ width: `${(s.count / total) * 100}%` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
            <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
            {s.label}: {s.count}
          </div>
        ))}
      </div>
    </div>
  )
}

export function AnalyticsDashboard({ onNavigate }) {
  const data = useMemo(() => {
    const log = storage.get('answerLog') || []
    const cards = storage.get('srsCards') || {}
    const testResults = storage.get('testResults') || []
    return {
      catAccuracy: computeCategoryAccuracy(log),
      daily: computeDailyActivity(log, 30),
      srsDist: computeSRSDistribution(cards),
      weak: computeWeakCategories(log),
      mastery: computeMasteryProgress(cards, questions.length),
      streak: computeStudyStreak(log),
      totalAnswered: log.length,
      totalCorrect: log.filter(e => e.correct).length,
      testResults,
    }
  }, [])

  const overallAccuracy = data.totalAnswered > 0
    ? Math.round((data.totalCorrect / data.totalAnswered) * 100)
    : 0

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Analytics</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <StatCard label="Accuracy" value={`${overallAccuracy}%`} color={overallAccuracy >= 90 ? 'text-emerald-500' : 'text-slate-900 dark:text-white'} />
        <StatCard label="Mastered" value={`${data.mastery.mastered}/${questions.length}`} color="text-indigo-600" />
        <StatCard label="Study Streak" value={`${data.streak}d`} color="text-amber-500" />
        <StatCard label="Questions Answered" value={data.totalAnswered} />
      </div>

      {/* Activity chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Last 30 Days</h2>
        <ActivityChart daily={data.daily} />
      </div>

      {/* SRS distribution */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Card Status</h2>
        <SRSDonut dist={data.srsDist} total={questions.length} />
      </div>

      {/* Category accuracy */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-6">
        <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Category Accuracy</h2>
        <CategoryChart catAccuracy={data.catAccuracy} onCategoryClick={(cat) => onNavigate?.(`categories`)} />
      </div>

      {/* Weak areas */}
      {data.weak.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Weak Areas</h2>
          <div className="space-y-2">
            {data.weak.map(w => (
              <div key={w.name} className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300 text-sm">{w.name}</span>
                <span className="text-rose-500 font-semibold text-sm">{Math.round(w.rate * 100)}%</span>
              </div>
            ))}
          </div>
          <button
            className="mt-4 w-full py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg text-sm font-medium hover:bg-rose-100 dark:hover:bg-rose-900/30 transition"
            onClick={() => onNavigate?.('weak')}
          >
            Drill Weak Areas
          </button>
        </div>
      )}

      {/* Test history */}
      {data.testResults.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Test History</h2>
          <div className="space-y-2">
            {data.testResults.slice().reverse().map((t, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{new Date(t.date).toLocaleDateString()}</span>
                <span className={`font-semibold ${t.passed ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {t.score}/{t.total} {t.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

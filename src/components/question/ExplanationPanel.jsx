import { useState, useEffect } from 'react'
import { getExplanation } from '../../lib/gemini'

export function ExplanationPanel({ question, userAnswer, correctAnswer, show }) {
  const [explanation, setExplanation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!show || !question) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getExplanation(question, userAnswer, correctAnswer)
      .then(text => {
        if (!cancelled) {
          setExplanation(text)
          setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [show, question, userAnswer, correctAnswer])

  if (!show) return null

  return (
    <div className="mt-4 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 slide-up">
      <h4 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-2">Explanation</h4>
      {loading && (
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-300">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          Generating explanation...
        </div>
      )}
      {error && (
        <div className="text-rose-600 dark:text-rose-400">
          <p>{error}</p>
          <button
            className="mt-2 text-sm underline"
            onClick={() => { setError(null); setLoading(true); getExplanation(question, userAnswer, correctAnswer).then(setExplanation).catch(e => setError(e.message)).finally(() => setLoading(false)) }}
          >
            Retry
          </button>
        </div>
      )}
      {explanation && (
        <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">
          {explanation}
        </div>
      )}
      {!loading && !error && !explanation && (
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Set up your Gemini API key in Settings to get AI-powered explanations.
        </p>
      )}
    </div>
  )
}

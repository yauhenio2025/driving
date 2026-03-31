import { useState, useImperativeHandle, forwardRef } from 'react'
import { getExplanation, generateDiagram } from '../../lib/gemini'
import * as storage from '../../lib/storage'
import { Markdown } from '../shared/Markdown'

export const ExplanationPanel = forwardRef(function ExplanationPanel({ question, userAnswer, correctAnswer }, ref) {
  const [explanation, setExplanation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [visible, setVisible] = useState(false)
  const [saved, setSaved] = useState(() => {
    const favs = storage.get('favorites') || []
    return favs.some(f => f.questionId === question.id)
  })
  const [diagram, setDiagram] = useState(null)
  const [diagramLoading, setDiagramLoading] = useState(false)

  const fetchExplanation = () => {
    setVisible(true)
    setLoading(true)
    setError(null)

    // Sequential pipeline: text explanation first, then feed it to Nano Banana 2 for the diagram
    getExplanation(question, userAnswer, correctAnswer)
      .then(text => {
        setExplanation(text)
        setLoading(false)
        // Now generate diagram informed by the explanation text
        setDiagramLoading(true)
        return generateDiagram(question, correctAnswer, text)
      })
      .then(result => {
        if (result) {
          setDiagram(result)
          setDiagramLoading(false)
        }
      })
      .catch(err => {
        if (!explanation) {
          // Text explanation failed
          setError(err.message)
          setLoading(false)
        }
        // Diagram failure is silent
        setDiagramLoading(false)
      })
  }

  const toggleFavorite = () => {
    storage.update('favorites', (favs) => {
      const list = favs || []
      const exists = list.findIndex(f => f.questionId === question.id)
      if (exists >= 0) {
        setSaved(false)
        return list.filter((_, i) => i !== exists)
      }
      setSaved(true)
      return [...list, {
        questionId: question.id,
        userAnswer,
        correctAnswer,
        explanation,
        savedAt: new Date().toISOString(),
      }]
    })
  }

  useImperativeHandle(ref, () => ({ fetchExplanation }))

  if (!visible) return null

  return (
    <div className="mt-4 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 slide-up">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-indigo-800 dark:text-indigo-200">Explanation</h4>
        {explanation && (
          <button
            onClick={toggleFavorite}
            className={`text-sm px-2.5 py-1 rounded-lg font-medium transition ${
              saved
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'
            }`}
            title={saved ? 'Remove from favorites' : 'Save to favorites'}
          >
            {saved ? '\u2605 Saved' : '\u2606 Save'}
          </button>
        )}
      </div>
      {loading && (
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-300">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          Searching regulations & generating explanation...
        </div>
      )}
      {error && (
        <div className="text-rose-600 dark:text-rose-400">
          <p className="text-sm">{error}</p>
          <button className="mt-2 text-sm underline" onClick={fetchExplanation}>
            Retry
          </button>
        </div>
      )}
      {explanation && (
        <Markdown text={explanation} className="text-slate-700 dark:text-slate-300" />
      )}

      {/* Visual Aid diagram from Nano Banana 2 */}
      {(diagramLoading || diagram) && (
        <div className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-700">
          <h5 className="font-medium text-indigo-700 dark:text-indigo-300 mb-2">Visual Aid</h5>
          {diagramLoading && !diagram && (
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-300 text-sm">
              <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              Generating diagram...
            </div>
          )}
          {diagram && (
            <div>
              <img
                src={diagram.image}
                alt="Visual explanation diagram"
                className="rounded-lg max-w-full border border-slate-200 dark:border-slate-600"
              />
              {diagram.caption && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 italic">{diagram.caption}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
})

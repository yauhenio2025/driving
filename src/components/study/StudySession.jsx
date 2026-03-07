import { useState, useEffect, useRef } from 'react'
import { QuestionCard } from '../question/QuestionCard'
import { OptionList } from '../question/OptionList'
import { AnswerFeedback } from '../question/AnswerFeedback'
import { ExplanationPanel } from '../question/ExplanationPanel'
import { ProgressBar } from '../shared/ProgressBar'
import { getQuestion } from '../../data/questions'
import { qualityFromAnswer } from '../../lib/srs'
import * as storage from '../../lib/storage'

export function StudySession({ questionIds, onComplete, reviewCard, title = 'Study Session', mode = 'study' }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [startTime, setStartTime] = useState(Date.now())
  const [results, setResults] = useState([])
  const [finished, setFinished] = useState(false)
  const [countdown, setCountdown] = useState(null)
  const [explaining, setExplaining] = useState(false)
  const [savedFav, setSavedFav] = useState(false)
  const timerRef = useRef(null)
  const explanationRef = useRef(null)
  const stateRef = useRef({ currentIndex, answered, explaining, finished })
  stateRef.current = { currentIndex, answered, explaining, finished }

  const question = questionIds[currentIndex] ? getQuestion(questionIds[currentIndex]) : null

  useEffect(() => {
    setStartTime(Date.now())
  }, [currentIndex])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearInterval(timerRef.current)
  }, [])

  function startCountdown() {
    clearInterval(timerRef.current)
    let secs = 5
    setCountdown(secs)
    timerRef.current = setInterval(() => {
      secs--
      if (secs <= 0) {
        clearInterval(timerRef.current)
        timerRef.current = null
        setCountdown(null)
        // Only advance if we haven't already moved on
        if (!stateRef.current.explaining) {
          doAdvance()
        }
      } else {
        setCountdown(secs)
      }
    }, 1000)
  }

  function stopCountdown() {
    clearInterval(timerRef.current)
    timerRef.current = null
    setCountdown(null)
  }

  function doAdvance() {
    stopCountdown()
    setCurrentIndex(prev => {
      const next = prev + 1
      if (next >= questionIds.length) {
        setFinished(true)
        return prev
      }
      return next
    })
    setSelected(null)
    setAnswered(false)
    setExplaining(false)
    setSavedFav(false)
  }

  function handleExplain() {
    setExplaining(true)
    stopCountdown()
    explanationRef.current?.fetchExplanation()
  }

  function handleSave() {
    if (!question || selected === null) return
    const cachedExplanation = storage.get(`explanation_${question.id}`)
    storage.update('favorites', (favs) => {
      const list = favs || []
      if (list.some(f => f.questionId === question.id)) return list
      return [...list, {
        questionId: question.id,
        userAnswer: question.options[selected],
        correctAnswer: question.correct_answer,
        explanation: cachedExplanation || null,
        savedAt: new Date().toISOString(),
      }]
    })
    setSavedFav(true)
  }

  function isWrong() {
    return answered && question && selected !== question.correct_index
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const s = stateRef.current
      if (s.finished) return
      if (!s.answered) {
        const q = questionIds[s.currentIndex] ? getQuestion(questionIds[s.currentIndex]) : null
        if (!q) return
        const idx = { '1': 0, '2': 1, '3': 2, '4': 3 }[e.key]
        if (idx !== undefined && idx < q.options.length) handleSelect(idx)
      } else {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          doAdvance()
        }
        if (e.key.toLowerCase() === 'e' && !s.explaining) {
          handleExplain()
        }
        if (e.key.toLowerCase() === 's') {
          handleSave()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [questionIds])

  function handleSelect(idx) {
    if (stateRef.current.answered) return
    const q = questionIds[stateRef.current.currentIndex] ? getQuestion(questionIds[stateRef.current.currentIndex]) : null
    if (!q) return

    setSelected(idx)
    setAnswered(true)
    setExplaining(false)

    const correct = idx === q.correct_index
    const responseTime = Date.now() - startTime
    const quality = qualityFromAnswer(correct, responseTime)

    storage.update('answerLog', (log) => [
      ...(log || []),
      {
        questionId: q.id,
        category: q.category,
        correct,
        mode,
        responseTimeMs: responseTime,
        timestamp: new Date().toISOString(),
      }
    ])

    if (reviewCard) {
      reviewCard(q.id, quality)
    }

    setResults(prev => [...prev, { questionId: q.id, correct }])
    startCountdown()
  }

  if (!questionIds.length) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">&#127881;</div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">All caught up!</h2>
        <p className="text-slate-500 dark:text-slate-400">No cards due for review. Come back later or start a new session.</p>
      </div>
    )
  }

  if (finished) {
    const correctCount = results.filter(r => r.correct).length
    const accuracy = Math.round((correctCount / results.length) * 100)
    return (
      <div className="text-center py-12 fade-in">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Session Complete</h2>
        <div className="text-6xl font-bold mb-2" style={{ color: accuracy >= 80 ? '#10b981' : accuracy >= 60 ? '#f59e0b' : '#f43f5e' }}>
          {accuracy}%
        </div>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          {correctCount} / {results.length} correct
        </p>
        <div className="flex gap-3 justify-center">
          <button
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
            onClick={() => onComplete?.()}
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  if (!question) return null

  const wrong = isWrong()

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
      </div>
      <ProgressBar value={currentIndex + (answered ? 1 : 0)} max={questionIds.length} className="mb-6" />

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-4">
        <QuestionCard question={question} index={currentIndex} total={questionIds.length} />
        <div className="mt-6">
          <OptionList
            options={question.options}
            selected={selected}
            correctIndex={question.correct_index}
            answered={answered}
            onSelect={handleSelect}
            isTrueFalse={question.type === 'true_false'}
          />
        </div>
        {answered && (
          <AnswerFeedback correct={!wrong} correctAnswer={question.correct_answer} />
        )}
        {wrong && (
          <ExplanationPanel
            ref={explanationRef}
            question={question}
            userAnswer={question.options[selected]}
            correctAnswer={question.correct_answer}
          />
        )}
      </div>

      {answered && (
        <div className="flex items-center justify-end gap-3">
          {!savedFav ? (
            <button
              className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/30 dark:hover:text-amber-300 transition font-medium text-sm"
              onClick={handleSave}
            >
              &#9734; Save (S)
            </button>
          ) : (
            <span className="px-4 py-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg font-medium text-sm">
              &#9733; Saved
            </span>
          )}
          {wrong && !explaining && (
            <button
              className="px-5 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-medium"
              onClick={handleExplain}
            >
              Explain (E)
            </button>
          )}
          {countdown > 0 && (
            <span className="text-sm text-slate-400 dark:text-slate-500 tabular-nums">{countdown}s</span>
          )}
          <button
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
            onClick={doAdvance}
          >
            {currentIndex + 1 >= questionIds.length ? 'Finish' : 'Next'}
          </button>
        </div>
      )}
    </div>
  )
}

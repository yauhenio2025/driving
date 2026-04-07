import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { questions, getQuestion, getImagePath } from '../../data/questions'
import { shuffleArray, formatTime } from '../../lib/utils'
import { useTimer } from '../../hooks/useTimer'
import { Badge } from '../shared/Badge'
import { ExplanationPanel } from '../question/ExplanationPanel'
import * as storage from '../../lib/storage'

function TestResults({ answers, testQuestions, timeUsed, onClose }) {
  const total = testQuestions.length
  const correctCount = answers.filter((a, i) => a === testQuestions[i].correct_index).length
  const score = Math.round((correctCount / total) * 100)
  const passed = score >= 90
  const [reviewIdx, setReviewIdx] = useState(null)
  const explanationRef = useRef(null)

  const wrongAnswers = testQuestions
    .map((q, i) => ({ question: q, userIdx: answers[i], idx: i }))
    .filter(x => x.userIdx !== x.question.correct_index)

  // Save result
  useEffect(() => {
    storage.update('testResults', (prev) => [
      ...(prev || []),
      { date: new Date().toISOString(), score: correctCount, total, passed, timeUsed }
    ])
  }, [])

  if (reviewIdx !== null) {
    const item = wrongAnswers[reviewIdx]
    return (
      <div>
        <button className="text-indigo-600 dark:text-indigo-400 mb-4 hover:underline" onClick={() => setReviewIdx(null)}>
          &larr; Back to results
        </button>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
          <Badge color="blue">{item.question.category}</Badge>
          <p className="text-lg font-medium text-slate-900 dark:text-white mt-3 mb-2">{item.question.text}</p>
          {item.question.image_file && (
            <img src={getImagePath(item.question)} alt="" className="rounded-lg max-h-48 mb-4" />
          )}
          <div className="space-y-2 mb-4">
            {item.question.options.map((opt, oi) => {
              let cls = 'px-3 py-2 rounded-lg text-sm '
              if (oi === item.question.correct_index) cls += 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
              else if (oi === item.userIdx) cls += 'bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700'
              else cls += 'text-slate-500 dark:text-slate-400'
              return <div key={oi} className={cls}>{opt}</div>
            })}
          </div>
          <button
            className="px-5 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-medium text-sm mb-4"
            onClick={() => explanationRef.current?.fetchExplanation()}
          >
            Explain
          </button>
          <ExplanationPanel
            ref={explanationRef}
            key={reviewIdx}
            question={item.question}
            userAnswer={item.question.options[item.userIdx]}
            correctAnswer={item.question.correct_answer}
          />
          <div className="flex justify-between mt-4">
            <button className="text-sm text-slate-500 hover:text-slate-700" onClick={() => setReviewIdx(Math.max(0, reviewIdx - 1))} disabled={reviewIdx === 0}>Previous</button>
            <span className="text-sm text-slate-400">{reviewIdx + 1} / {wrongAnswers.length}</span>
            <button className="text-sm text-slate-500 hover:text-slate-700" onClick={() => setReviewIdx(Math.min(wrongAnswers.length - 1, reviewIdx + 1))} disabled={reviewIdx === wrongAnswers.length - 1}>Next</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="text-center mb-8">
        <div className={`inline-block px-6 py-2 rounded-full text-lg font-bold mb-4 ${passed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200'}`}>
          {passed ? 'PASSED' : 'FAILED'}
        </div>
        <div className="text-6xl font-bold text-slate-900 dark:text-white mb-2">{correctCount}/{total}</div>
        <p className="text-slate-500 dark:text-slate-400">Score: {score}% | Time: {formatTime(2700 - timeUsed)}</p>
      </div>

      {wrongAnswers.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Wrong Answers ({wrongAnswers.length})</h3>
          <div className="space-y-2">
            {wrongAnswers.map((item, i) => (
              <button
                key={i}
                className="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm"
                onClick={() => setReviewIdx(i)}
              >
                <span className="text-rose-500 mr-2">#{item.idx + 1}</span>
                <span className="text-slate-700 dark:text-slate-300">{item.question.text.slice(0, 80)}...</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <button className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}

export function TestSimulationPage() {
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [testQuestions, setTestQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState([])
  const [flagged, setFlagged] = useState(new Set())
  const [showConfirm, setShowConfirm] = useState(false)

  const onExpire = useCallback(() => setFinished(true), [])
  const { timeLeft, start, isRunning } = useTimer(2700, onExpire) // 45 min

  const startTest = () => {
    const selected = shuffleArray(questions).slice(0, 100)
    setTestQuestions(selected)
    setAnswers(new Array(selected.length).fill(null))
    setStarted(true)
    start()
  }

  const selectAnswer = (idx) => {
    setAnswers(prev => {
      const next = [...prev]
      next[currentIdx] = idx
      return next
    })
  }

  const toggleFlag = () => {
    setFlagged(prev => {
      const next = new Set(prev)
      if (next.has(currentIdx)) next.delete(currentIdx)
      else next.add(currentIdx)
      return next
    })
  }

  const submit = () => {
    // Log answers
    for (let i = 0; i < testQuestions.length; i++) {
      if (answers[i] !== null) {
        storage.update('answerLog', (log) => [
          ...(log || []),
          {
            questionId: testQuestions[i].id,
            category: testQuestions[i].category,
            correct: answers[i] === testQuestions[i].correct_index,
            mode: 'test',
            timestamp: new Date().toISOString(),
          }
        ])
      }
    }
    setFinished(true)
  }

  // Keyboard shortcuts during test
  useEffect(() => {
    if (!started || finished) return
    const handler = (e) => {
      const q = testQuestions[currentIdx]
      if (!q) return
      if (e.key === 'f') toggleFlag()
      if (e.key === 'ArrowRight' || e.key === 'n') setCurrentIdx(prev => Math.min(prev + 1, testQuestions.length - 1))
      if (e.key === 'ArrowLeft' || e.key === 'p') setCurrentIdx(prev => Math.max(prev - 1, 0))
      const numIdx = { '1': 0, '2': 1, '3': 2, '4': 3 }[e.key]
      if (numIdx !== undefined && numIdx < q.options.length) selectAnswer(numIdx)
      if (q.type === 'true_false') {
        if (e.key.toLowerCase() === 'r') selectAnswer(0)
        if (e.key.toLowerCase() === 'w') selectAnswer(1)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  if (finished) {
    return <TestResults answers={answers} testQuestions={testQuestions} timeUsed={timeLeft} onClose={() => { setStarted(false); setFinished(false) }} />
  }

  if (!started) {
    return (
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Mock Test</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-2 max-w-md mx-auto">
          Simulates the real Subject 1 exam: 100 random questions, 45-minute time limit.
          You need 90% (90/100) to pass.
        </p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-8">
          Keyboard: 1-4 to answer, arrow keys to navigate, F to flag
        </p>
        <button
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-lg shadow-lg shadow-indigo-200 dark:shadow-none"
          onClick={startTest}
        >
          Start Test
        </button>
      </div>
    )
  }

  const q = testQuestions[currentIdx]
  const answeredCount = answers.filter(a => a !== null).length
  const imgPath = getImagePath(q)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-semibold text-slate-900 dark:text-white">
          Question {currentIdx + 1} / {testQuestions.length}
        </div>
        <div className={`text-lg font-mono font-bold ${timeLeft < 300 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress */}
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mb-6">
        <div className="bg-indigo-600 h-1.5 rounded-full transition-all" style={{ width: `${(answeredCount / testQuestions.length) * 100}%` }} />
      </div>

      {/* Question */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-4">
        <Badge color="blue">{q.category}</Badge>
        <p className="text-lg font-medium text-slate-900 dark:text-white mt-3 mb-4">{q.text}</p>
        {imgPath && <img src={imgPath} alt="" className="rounded-lg max-h-48 mb-4" />}
        <div className="space-y-3">
          {q.options.map((opt, i) => {
            const isSelected = answers[currentIdx] === i
            return (
              <button
                key={i}
                className={`w-full text-left px-4 py-3.5 rounded-xl border-2 font-medium transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200'
                    : 'border-slate-200 dark:border-slate-600 hover:border-indigo-300 text-slate-700 dark:text-slate-200'
                }`}
                onClick={() => selectAnswer(i)}
              >
                {q.type !== 'true_false' && `${i + 1}. `}{opt}
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
          onClick={() => setCurrentIdx(prev => prev - 1)}
          disabled={currentIdx === 0}
        >
          Previous
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium ${flagged.has(currentIdx) ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
          onClick={toggleFlag}
        >
          {flagged.has(currentIdx) ? 'Flagged' : 'Flag'}
        </button>
        {currentIdx < testQuestions.length - 1 ? (
          <button
            className="px-4 py-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-medium"
            onClick={() => setCurrentIdx(prev => prev + 1)}
          >
            Next
          </button>
        ) : (
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            onClick={() => setShowConfirm(true)}
          >
            Submit
          </button>
        )}
      </div>

      {/* Question palette */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-4">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3">Question Map</h3>
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
          {testQuestions.map((_, i) => {
            let bg = 'bg-slate-100 dark:bg-slate-700 text-slate-500'
            if (i === currentIdx) bg = 'bg-indigo-600 text-white'
            else if (flagged.has(i)) bg = 'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100'
            else if (answers[i] !== null) bg = 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
            return (
              <button
                key={i}
                className={`w-8 h-8 rounded text-xs font-medium ${bg} hover:opacity-80 transition`}
                onClick={() => setCurrentIdx(i)}
              >
                {i + 1}
              </button>
            )
          })}
        </div>
      </div>

      {/* Submit confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Submit Test?</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-1">
              Answered: {answeredCount} / {testQuestions.length}
            </p>
            {answeredCount < testQuestions.length && (
              <p className="text-amber-600 dark:text-amber-400 text-sm mb-4">
                You have {testQuestions.length - answeredCount} unanswered questions.
              </p>
            )}
            <div className="flex gap-3 mt-4">
              <button className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300" onClick={() => setShowConfirm(false)}>
                Continue
              </button>
              <button className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700" onClick={submit}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

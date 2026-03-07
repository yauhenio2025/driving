import { useState, useEffect, useCallback } from 'react'
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

  const question = questionIds[currentIndex] ? getQuestion(questionIds[currentIndex]) : null
  const hasApiKey = !!storage.get('settings')?.apiKey

  useEffect(() => {
    setStartTime(Date.now())
  }, [currentIndex])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (finished) return
      if (!answered) {
        if (!question) return
        const isTF = question.type === 'true_false'
        if (isTF) {
          if (e.key.toLowerCase() === 'r' || e.key === '1') handleSelect(0)
          if (e.key.toLowerCase() === 'w' || e.key === '2') handleSelect(1)
        } else {
          const idx = { '1': 0, '2': 1, '3': 2, '4': 3 }[e.key]
          if (idx !== undefined && idx < question.options.length) handleSelect(idx)
        }
      } else {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleNext()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const handleSelect = useCallback((idx) => {
    if (answered) return
    setSelected(idx)
    setAnswered(true)

    const correct = idx === question.correct_index
    const responseTime = Date.now() - startTime
    const quality = qualityFromAnswer(correct, responseTime)

    // Log answer
    storage.update('answerLog', (log) => [
      ...(log || []),
      {
        questionId: question.id,
        category: question.category,
        correct,
        mode,
        responseTimeMs: responseTime,
        timestamp: new Date().toISOString(),
      }
    ])

    // Update SRS card
    if (reviewCard) {
      reviewCard(question.id, quality)
    }

    setResults(prev => [...prev, { questionId: question.id, correct }])
  }, [answered, question, startTime, reviewCard, mode])

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= questionIds.length) {
      setFinished(true)
      return
    }
    setCurrentIndex(prev => prev + 1)
    setSelected(null)
    setAnswered(false)
  }, [currentIndex, questionIds.length])

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

  const isWrong = answered && selected !== question.correct_index

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
          <AnswerFeedback correct={!isWrong} correctAnswer={question.correct_answer} />
        )}
        {isWrong && hasApiKey && (
          <ExplanationPanel
            question={question}
            userAnswer={question.options[selected]}
            correctAnswer={question.correct_answer}
            show={true}
          />
        )}
      </div>

      {answered && (
        <div className="flex justify-end">
          <button
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
            onClick={handleNext}
          >
            {currentIndex + 1 >= questionIds.length ? 'Finish' : 'Next'}
          </button>
        </div>
      )}
    </div>
  )
}

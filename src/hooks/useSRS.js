import { useState, useCallback, useMemo } from 'react'
import * as storage from '../lib/storage'
import * as srs from '../lib/srs'
import { questions } from '../data/questions'
import { shuffleArray } from '../lib/utils'

export function useSRS() {
  const [cards, setCards] = useState(() => storage.get('srsCards') || {})

  const save = useCallback((newCards) => {
    setCards(newCards)
    storage.set('srsCards', newCards)
  }, [])

  const dueCards = useMemo(() => srs.getDueCards(cards), [cards])

  const allIds = useMemo(() => questions.map(q => q.id), [])

  const newCardIds = useMemo(
    () => srs.getNewCards(cards, shuffleArray(allIds)),
    [cards, allIds]
  )

  const reviewCard = useCallback((questionId, quality) => {
    const card = cards[questionId] || srs.createCardState(questionId)
    const updated = srs.processReview(card, quality)
    const newCards = { ...cards, [questionId]: updated }
    save(newCards)
  }, [cards, save])

  const buildSession = useCallback((maxNew = 10, maxTotal = 20) => {
    const due = srs.getDueCards(cards, maxTotal)
    const remaining = maxTotal - due.length
    const newCount = Math.min(remaining, maxNew)
    const newIds = srs.getNewCards(cards, shuffleArray(allIds), newCount)
    return [...due.map(c => c.questionId), ...newIds]
  }, [cards, allIds])

  const buildWeakSession = useCallback((weakCategoryNames, maxTotal = 20) => {
    const weakQuestions = questions.filter(q => weakCategoryNames.includes(q.category))
    const wrongIds = new Set()
    const log = storage.get('answerLog') || []
    for (const entry of log) {
      if (!entry.correct && weakCategoryNames.includes(entry.category)) {
        wrongIds.add(entry.questionId)
      }
    }
    const prioritized = [
      ...weakQuestions.filter(q => wrongIds.has(q.id)),
      ...weakQuestions.filter(q => !wrongIds.has(q.id)),
    ]
    return shuffleArray(prioritized.slice(0, maxTotal)).map(q => q.id)
  }, [])

  return {
    cards,
    dueCards,
    newCardIds,
    reviewCard,
    buildSession,
    buildWeakSession,
    totalMastered: Object.values(cards).filter(c => c.repetitions >= 3).length,
  }
}

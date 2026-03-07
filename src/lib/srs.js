export function createCardState(questionId) {
  return {
    questionId,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: Date.now(),
    lastReview: null,
  }
}

export function processReview(card, quality) {
  const now = Date.now()
  const newCard = { ...card, lastReview: now }

  if (quality >= 3) {
    if (newCard.repetitions === 0) {
      newCard.interval = 1
    } else if (newCard.repetitions === 1) {
      newCard.interval = 6
    } else {
      newCard.interval = Math.round(newCard.interval * newCard.easeFactor)
    }
    newCard.repetitions += 1
  } else {
    newCard.repetitions = 0
    newCard.interval = 0
    newCard.dueDate = now + 10 * 60 * 1000 // 10 minutes
    newCard.easeFactor = Math.max(1.3, newCard.easeFactor - 0.2)
    return newCard
  }

  newCard.easeFactor = Math.max(
    1.3,
    newCard.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  )
  newCard.dueDate = now + newCard.interval * 24 * 60 * 60 * 1000

  return newCard
}

export function getDueCards(cards, limit = 50) {
  const now = Date.now()
  return Object.values(cards)
    .filter(c => c.dueDate <= now && c.lastReview !== null)
    .sort((a, b) => a.dueDate - b.dueDate)
    .slice(0, limit)
}

export function getNewCards(cards, allQuestionIds, limit = 10) {
  const seen = new Set(Object.keys(cards).map(Number))
  return allQuestionIds
    .filter(id => !seen.has(id))
    .slice(0, limit)
}

export function getCardStatus(card) {
  if (!card) return 'new'
  if (card.interval === 0) return 'learning'
  if (card.interval < 21) return 'young'
  return 'mature'
}

export function qualityFromAnswer(correct, responseTimeMs) {
  if (!correct) return 1
  if (responseTimeMs < 5000) return 5
  return 4
}

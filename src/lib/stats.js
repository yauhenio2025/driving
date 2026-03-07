export function computeCategoryAccuracy(answerLog) {
  const cats = {}
  for (const entry of answerLog) {
    if (!cats[entry.category]) cats[entry.category] = { correct: 0, total: 0 }
    cats[entry.category].total++
    if (entry.correct) cats[entry.category].correct++
  }
  for (const key of Object.keys(cats)) {
    cats[key].rate = cats[key].total > 0 ? cats[key].correct / cats[key].total : 0
  }
  return cats
}

export function computeDailyActivity(answerLog, days = 30) {
  const now = new Date()
  const result = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const dayEntries = answerLog.filter(e => e.timestamp?.slice(0, 10) === dateStr)
    result.push({
      date: dateStr,
      count: dayEntries.length,
      correct: dayEntries.filter(e => e.correct).length,
    })
  }
  return result
}

export function computeSRSDistribution(srsCards) {
  const dist = { new: 0, learning: 0, young: 0, mature: 0 }
  for (const card of Object.values(srsCards)) {
    if (card.interval === 0 && card.repetitions === 0) dist.learning++
    else if (card.interval === 0) dist.learning++
    else if (card.interval < 21) dist.young++
    else dist.mature++
  }
  return dist
}

export function computeWeakCategories(answerLog, topN = 5) {
  const cats = computeCategoryAccuracy(answerLog)
  return Object.entries(cats)
    .filter(([, v]) => v.total >= 5)
    .sort((a, b) => a[1].rate - b[1].rate)
    .slice(0, topN)
    .map(([name, stats]) => ({ name, ...stats }))
}

export function computeMasteryProgress(srsCards, totalQuestions) {
  const cards = Object.values(srsCards)
  const mastered = cards.filter(c => c.repetitions >= 3).length
  const learning = cards.filter(c => c.repetitions > 0 && c.repetitions < 3).length
  return { mastered, learning, unseen: totalQuestions - mastered - learning }
}

export function computeStudyStreak(answerLog) {
  if (answerLog.length === 0) return 0
  const days = new Set(answerLog.map(e => e.timestamp?.slice(0, 10)).filter(Boolean))
  let streak = 0
  const now = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    if (days.has(dateStr)) {
      streak++
    } else if (i === 0) {
      continue // today might not have activity yet
    } else {
      break
    }
  }
  return streak
}

import questionsData from '../../data/questions.json'

export const questions = questionsData

export const questionsById = new Map(questions.map(q => [q.id, q]))

export const questionsByCategory = new Map()
for (const q of questions) {
  if (!questionsByCategory.has(q.category)) {
    questionsByCategory.set(q.category, [])
  }
  questionsByCategory.get(q.category).push(q)
}

export const categories = [...questionsByCategory.keys()].sort()

export function getQuestion(id) {
  return questionsById.get(id)
}

export function getImagePath(q) {
  if (!q.image_file) return null
  return `/images/${q.image_file}`
}

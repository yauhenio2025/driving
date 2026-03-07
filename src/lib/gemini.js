import * as storage from './storage'
import { categoryToChapters } from '../data/trafficLaw'

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent'

function buildPrompt(question, userAnswer, correctAnswer) {
  const relevantChapters = categoryToChapters[question.category] || []
  const lawContext = relevantChapters.length > 0
    ? `\nRELEVANT LAW ARTICLES:\n${relevantChapters.join('\n')}`
    : ''

  return `You are a Chinese driving test tutor. A student answered incorrectly on a Subject 1 (科目一) question.

QUESTION: ${question.text}
OPTIONS: ${question.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join(' | ')}
STUDENT ANSWERED: ${userAnswer}
CORRECT ANSWER: ${correctAnswer}
${lawContext}

Provide:
1) Why the correct answer is right (cite specific law article number if applicable)
2) Why the student's answer is wrong
3) A memorable tip or mnemonic to remember this
4) The key principle being tested

Keep the response under 200 words. Be clear and direct.`
}

export async function getExplanation(question, userAnswer, correctAnswer) {
  const cacheKey = `explanation_${question.id}`
  const cached = storage.get(cacheKey)
  if (cached) return cached

  const apiKey = storage.get('settings')?.apiKey
  if (!apiKey) return null

  const response = await fetch(`${API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(question, userAnswer, correctAnswer) }] }],
      generationConfig: {
        temperature: 0.3,
        thinkingConfig: { thinkingBudget: -1 },
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${err}`)
  }

  const data = await response.json()
  const parts = data.candidates?.[0]?.content?.parts || []
  const text = parts
    .filter(p => p.text && !p.thought)
    .map(p => p.text)
    .join('\n')

  storage.set(cacheKey, text)
  return text
}

export async function testApiKey(apiKey) {
  const response = await fetch(`${API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Say "OK" and nothing else.' }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 10 },
    }),
  })
  return response.ok
}

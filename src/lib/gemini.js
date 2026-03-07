import * as storage from './storage'
import { categoryToChapters } from '../data/trafficLaw'
import { getImagePath } from '../data/questions'

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent'

async function fetchImageAsBase64(question) {
  const path = getImagePath(question)
  if (!path) return null
  try {
    const resp = await fetch(path)
    const blob = await resp.blob()
    const buffer = await blob.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
    const mimeType = blob.type || 'image/png'
    return { base64, mimeType }
  } catch {
    return null
  }
}

function buildPrompt(question, userAnswer, correctAnswer) {
  const relevantChapters = categoryToChapters[question.category] || []
  const lawContext = relevantChapters.length > 0
    ? `\nRELEVANT LAW ARTICLES FROM CHINA'S ROAD TRAFFIC SAFETY LAW (2003):\n${relevantChapters.slice(0, 10).join('\n')}`
    : ''

  return `You are a Chinese driving test tutor. A student answered incorrectly on a Subject 1 (科目一) question. IMPORTANT: Respond entirely in English.
${question.image_file ? '\nAn image is attached to this question — LOOK AT IT CAREFULLY to understand the sign/situation before answering.\n' : ''}
QUESTION: ${question.text}
OPTIONS: ${question.options.map((o, i) => `${i + 1}) ${o}`).join(' | ')}
STUDENT ANSWERED: ${userAnswer}
CORRECT ANSWER: ${correctAnswer}
CATEGORY: ${question.category}
${lawContext}

Search for the relevant Chinese road traffic regulations if needed. Then provide:
1) Why the correct answer is right (cite specific law article number if applicable)
2) Why the student's answer is wrong
3) A memorable tip or mnemonic to remember this
4) The key principle being tested

Keep the response under 250 words. Be clear and direct. Write ONLY in English.
If the image contains any Chinese characters, TRANSLATE every single one into English (e.g. "王平 = Wangping, 新屿 = Xinyu").`
}

export async function getExplanation(question, userAnswer, correctAnswer) {
  const cacheKey = `explanation_${question.id}`
  const cached = storage.get(cacheKey)
  if (cached) return cached

  const apiKey = storage.get('settings')?.apiKey
  if (!apiKey) throw new Error('No API key configured. Go to Settings to add your Gemini API key.')

  const image = await fetchImageAsBase64(question)
  const parts = [{ text: buildPrompt(question, userAnswer, correctAnswer) }]
  if (image) {
    parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } })
  }

  const response = await fetch(`${API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      tools: [{ google_search: {} }],
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
  const responseParts = data.candidates?.[0]?.content?.parts || []
  const text = responseParts
    .filter(p => p.text && !p.thought)
    .map(p => p.text)
    .join('\n')

  if (!text) throw new Error('Empty response from Gemini')

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

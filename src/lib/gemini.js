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

  return `You're helping a student studying for the Chinese driving test (Subject 1 / 科目一). They just got this question wrong. Write in English only.
${question.image_file ? '\nAn image is attached — LOOK AT IT CAREFULLY before responding.\n' : ''}
**Question:** ${question.text}
**Options:** ${question.options.map((o, i) => `${i + 1}) ${o}`).join(' | ')}
**They picked:** ${userAnswer}
**Correct answer:** ${correctAnswer}
**Category:** ${question.category}
${lawContext}

Write a natural, conversational explanation — like a knowledgeable friend explaining over coffee, not a textbook. Use markdown formatting (bold, headers, bullet points) to make it scannable.

Structure it roughly like this but DO NOT use numbered sections or mechanical headers like "1) Why the correct answer is right". Flow naturally:
- Start by directly explaining what the right answer is and why — cite a specific law article if relevant
- Then briefly say why their choice was wrong (be specific, not generic)
- End with a **memorable trick, mnemonic, or vivid mental image** to lock it in — this is the most important part. Be creative. Make it stick.

If the image has Chinese characters, translate ALL of them (e.g. "王平 = Wangping").

Keep it under 200 words. Be concise and punchy — no filler, no "Let's review this question", no "Hello". Just go straight into the explanation.`
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

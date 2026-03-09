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

  return `You are a driving test tutor helping a student pass the Chinese driving exam (Subject 1 / 科目一). They just answered this question WRONG. Write in English only.
${question.image_file ? '\nAn image is attached — EXAMINE IT CAREFULLY. Describe what you see in the image and how it relates to the answer.\n' : ''}
**Question:** ${question.text}
**Options:** ${question.options.map((o, i) => `${i + 1}) ${o}`).join(' | ')}
**Student chose:** ${userAnswer}
**Correct answer:** ${correctAnswer}
**Category:** ${question.category}
${lawContext}

Use Google Search to look up the ACTUAL current Chinese traffic regulation that governs this question. Cite the specific regulation/article number if found.

Write a clear, punchy explanation using markdown (bold, bullets). No filler, no greetings. Go straight in. Follow this EXACT structure with these headers:

**Why "${userAnswer}" seems right (but isn't)**
Start here. Diagnose the specific trap or misconception. Name the reasoning that likely led to this wrong choice — "You probably picked this because..." Lean into the surprise of being wrong. Be specific to THIS question, not generic.

**The real rule (and why it exists)**
State the correct answer, then cite the specific Chinese traffic law article or regulation. Then explain the SAFETY RATIONALE — why does this rule exist? What accident/danger does it prevent? Connect the abstract rule to a real-world consequence. This turns a rote fact into logical understanding.

**Remember it**
Create ONE vivid, specific, slightly absurd mental image or mnemonic for THIS question. Make it visual, emotional, or funny — bizarre imagery sticks better than plain facts. Be creative and specific, not generic. Examples of good techniques: a mini-scenario ("Imagine you're..."), a visual association, a rhyme, an exaggerated comparison.

**Test yourself**
Write ONE brief follow-up question (different from the original) that tests whether the student truly understood the underlying principle, not just memorized the answer. Include the answer in parentheses.

If the image has Chinese characters, translate ALL of them (e.g. "王平 = Wangping").

Keep the total explanation under 250 words. Every sentence must earn its place.`
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

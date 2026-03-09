import * as storage from './storage'
import { categoryToChapters } from '../data/trafficLaw'
import { getImagePath } from '../data/questions'

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent'
const IMAGE_GEN_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent'

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
        thinkingConfig: { thinkingLevel: 'high' },
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

function buildDiagramPrompt(question, correctAnswer) {
  return `You are creating a helpful educational diagram for a Chinese driving test student who answered this question incorrectly.

**Question:** ${question.text}
**Correct answer:** ${correctAnswer}
**Category:** ${question.category}
${question.image_file ? '\nThe question includes a traffic sign/image (attached). Use it as reference for your diagram.' : ''}

Use Google Search (including image search) to find accurate reference images of any Chinese traffic signs, road markings, or dashboard indicators mentioned in the question.

Generate ONE clear, educational diagram that makes the correct answer visually obvious and easy to remember. Pick the single best format for THIS question:

- **Sign comparison**: Show the correct sign next to the most commonly confused similar sign(s). Label each with its meaning. Highlight the key visual difference (color, shape, symbol) that distinguishes them.
- **Road scenario**: Bird's-eye view showing vehicles, lanes, and arrows for correct movement. Label key distances, speeds, or rules. Show what to do vs. what NOT to do.
- **Quick-reference infographic**: For penalties, speed limits, or distance rules — arrange the key numbers/thresholds in a clean, memorable visual hierarchy.
- **Dashboard indicator**: Show the light/symbol large and clear with its meaning labeled.
- **Procedure diagram**: For multi-step rules (accident handling, breakdown procedure), show a simple numbered flow.

Style requirements:
- Clean white background
- Bold, saturated colors (use red for dangers/prohibitions, green for correct actions, yellow for warnings)
- All text in ENGLISH, large and readable
- Simple and uncluttered — like the best textbook illustration
- Include a clear title at the top summarizing what the diagram teaches`
}

export async function generateDiagram(question, correctAnswer) {
  const cacheKey = `diagram_${question.id}`
  const cached = storage.get(cacheKey)
  if (cached) return cached

  const apiKey = storage.get('settings')?.apiKey
  if (!apiKey) throw new Error('No API key')

  const parts = [{ text: buildDiagramPrompt(question, correctAnswer) }]

  const image = await fetchImageAsBase64(question)
  if (image) {
    parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } })
  }

  const response = await fetch(`${IMAGE_GEN_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      tools: [{ google_search: { searchTypes: { webSearch: {}, imageSearch: {} } } }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { imageSize: '1K' },
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Diagram API error: ${response.status}`)
  }

  const data = await response.json()
  const responseParts = data.candidates?.[0]?.content?.parts || []

  let imageData = null
  let caption = ''

  for (const p of responseParts) {
    if (p.thought) continue
    if (p.text) caption += p.text
    if (p.inlineData) {
      imageData = `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`
    }
  }

  if (!imageData) throw new Error('No diagram generated')

  const result = { image: imageData, caption: caption.trim() }
  try { storage.set(cacheKey, result) } catch (e) { /* localStorage quota exceeded — skip cache */ }
  return result
}

export async function testApiKey(apiKey) {
  const testUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent'
  const response = await fetch(`${testUrl}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Say "OK" and nothing else.' }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 10 },
    }),
  })
  return response.ok
}

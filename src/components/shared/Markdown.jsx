/**
 * Lightweight markdown renderer — handles bold, headers, bullets, and line breaks.
 * No dependencies.
 */
export function Markdown({ text, className = '' }) {
  const html = renderMarkdown(text)
  return (
    <div
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderInline(line) {
  // Bold: **text** or __text__
  line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  line = line.replace(/__(.+?)__/g, '<strong>$1</strong>')
  // Italic: *text* or _text_ (but not inside words with underscores)
  line = line.replace(/(?<!\w)\*([^*]+?)\*(?!\w)/g, '<em>$1</em>')
  line = line.replace(/(?<!\w)_([^_]+?)_(?!\w)/g, '<em>$1</em>')
  // Inline code: `text`
  line = line.replace(/`([^`]+?)`/g, '<code>$1</code>')
  return line
}

function renderMarkdown(text) {
  const lines = text.split('\n')
  const out = []
  let inList = false

  for (let i = 0; i < lines.length; i++) {
    let line = escapeHtml(lines[i])

    // Headers
    if (line.startsWith('### ')) {
      if (inList) { out.push('</ul>'); inList = false }
      out.push(`<h4>${renderInline(line.slice(4))}</h4>`)
      continue
    }
    if (line.startsWith('## ')) {
      if (inList) { out.push('</ul>'); inList = false }
      out.push(`<h3>${renderInline(line.slice(3))}</h3>`)
      continue
    }

    // Bullet list
    if (/^[-*]\s/.test(line)) {
      if (!inList) { out.push('<ul>'); inList = true }
      out.push(`<li>${renderInline(line.slice(2))}</li>`)
      continue
    }

    if (inList) { out.push('</ul>'); inList = false }

    // Empty line = paragraph break
    if (line.trim() === '') {
      out.push('<br/>')
      continue
    }

    // Regular paragraph
    out.push(`<p>${renderInline(line)}</p>`)
  }

  if (inList) out.push('</ul>')
  return out.join('')
}

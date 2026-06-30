/**
 * AIResponse — renders structured LLM markdown output cleanly.
 * Handles: ### headings, **bold**, numbered lists, bullet lists, plain paragraphs.
 * No external markdown library needed.
 */

interface Props {
  content: string
  compact?: boolean
}

function parseLine(line: string, key: number) {
  // Replace **bold** inline
  const parts = line.split(/(\*\*[^*]+\*\*)/)
  return (
    <span key={key}>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} style={{ fontWeight: 700, color: '#111827' }}>{part.slice(2, -2)}</strong>
          : part
      )}
    </span>
  )
}

export default function AIResponse({ content, compact = false }: Props) {
  if (!content) return null

  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()

    if (!line) { i++; continue }

    // ### Heading
    if (line.startsWith('### ')) {
      elements.push(
        <div key={i} style={{
          fontSize: compact ? 11 : 12,
          fontWeight: 800,
          color: '#E31837',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginTop: elements.length > 0 ? 14 : 0,
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <div style={{ width: 3, height: 12, background: '#E31837', borderRadius: 99, flexShrink: 0 }} />
          {line.slice(4)}
        </div>
      )
      i++; continue
    }

    // ## Heading (fallback)
    if (line.startsWith('## ')) {
      elements.push(
        <div key={i} style={{ fontSize: compact ? 12 : 13, fontWeight: 700, color: '#111827', marginTop: 12, marginBottom: 4 }}>
          {line.slice(3)}
        </div>
      )
      i++; continue
    }

    // Numbered list item: "1. " or "1) "
    if (/^\d+[.)]\s/.test(line)) {
      const numMatch = line.match(/^(\d+)[.)]\s(.*)/)
      if (numMatch) {
        elements.push(
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'flex-start' }}>
            <div style={{
              width: 20, height: 20, borderRadius: 6, flexShrink: 0,
              background: '#FFF5F6', border: '1px solid #FECDD3',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: '#E31837', marginTop: 1,
            }}>
              {numMatch[1]}
            </div>
            <span style={{ fontSize: compact ? 11 : 12, color: '#374151', lineHeight: 1.6 }}>
              {parseLine(numMatch[2], i)}
            </span>
          </div>
        )
        i++; continue
      }
    }

    // Bullet: "- " or "• "
    if (line.startsWith('- ') || line.startsWith('• ')) {
      const text = line.startsWith('- ') ? line.slice(2) : line.slice(2)
      elements.push(
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3, alignItems: 'flex-start' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#E31837', flexShrink: 0, marginTop: 6 }} />
          <span style={{ fontSize: compact ? 11 : 12, color: '#374151', lineHeight: 1.6 }}>
            {parseLine(text, i)}
          </span>
        </div>
      )
      i++; continue
    }

    // Sub-bullet: "  - " or "   •"
    if (/^\s{2,}[-•]/.test(line)) {
      const text = line.replace(/^\s+[-•]\s*/, '')
      elements.push(
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3, alignItems: 'flex-start', paddingLeft: 16 }}>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#9CA3AF', flexShrink: 0, marginTop: 6 }} />
          <span style={{ fontSize: compact ? 10 : 11, color: '#6B7280', lineHeight: 1.6 }}>
            {parseLine(text, i)}
          </span>
        </div>
      )
      i++; continue
    }

    // **Bottom line:** or bold-only line
    if (line.startsWith('**Bottom line') || line.startsWith('**Note')) {
      elements.push(
        <div key={i} style={{
          marginTop: 10, padding: '8px 12px',
          background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 8,
          fontSize: compact ? 11 : 12, color: '#374151', lineHeight: 1.6,
        }}>
          {parseLine(line, i)}
        </div>
      )
      i++; continue
    }

    // Plain paragraph
    elements.push(
      <p key={i} style={{ fontSize: compact ? 11 : 12, color: '#374151', lineHeight: 1.7, marginBottom: 4 }}>
        {parseLine(line, i)}
      </p>
    )
    i++
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{elements}</div>
}

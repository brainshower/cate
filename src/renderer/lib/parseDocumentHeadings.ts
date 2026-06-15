export interface DocumentHeading {
  line: number
  level: number
  text: string
}

export interface HeadingTextModel {
  getLineCount: () => number
  getLineContent: (lineNumber: number) => string
}

const MARKDOWN_HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/
const SETEXT_HEADING_RE = /^\s*(=+|-+)\s*$/
const HTML_HEADING_RE = /<h([1-6])(?:\s[^>]*)?>(.*?)<\/h\1>/i
const FRONTMATTER_FENCE_RE = /^---\s*$/

function frontmatterBodyStart(model: HeadingTextModel, lineCount: number): number {
  // Detect a leading YAML frontmatter block (a `---` fence on line 1 with a
  // closing `---` fence later) and return the first body line after it. This
  // stops the closing fence from turning the last frontmatter line into a
  // phantom setext heading. We bail if an ATX heading appears before the
  // closing fence, so a leading `---` thematic break that merely wraps real
  // content is never mistaken for frontmatter.
  if (lineCount < 2 || !FRONTMATTER_FENCE_RE.test(model.getLineContent(1))) return 1
  for (let lineNumber = 2; lineNumber <= lineCount; lineNumber++) {
    const line = model.getLineContent(lineNumber)
    if (/^#{1,6}\s/.test(line)) return 1
    if (FRONTMATTER_FENCE_RE.test(line)) return lineNumber + 1
  }
  return 1
}

function clampDepth(maxDepth: number): number {
  if (!Number.isFinite(maxDepth)) return 3
  return Math.min(6, Math.max(2, Math.trunc(maxDepth)))
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

export function stripMarkdownInlineFormatting(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    .replace(/___([^_]+)___/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim()
}

export function slugifyHeading(text: string): string {
  return stripMarkdownInlineFormatting(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function createHeadingIdTracker(): (text: string) => string {
  const counts = new Map<string, number>()
  return (text: string) => {
    const base = slugifyHeading(text)
    const count = counts.get(base) ?? 0
    counts.set(base, count + 1)
    return count === 0 ? base : `${base}-${count}`
  }
}

function markerLevel(indent: string): number {
  if (indent.length >= 4) return 3
  if (indent.length >= 2) return 2
  return 1
}

function cleanCodeMarkerTitle(raw: string): string {
  return raw
    .replace(/^\s*#+\s*/, '')
    .replace(/^\s*[-=]{2,}\s*/, '')
    .replace(/\s*[-=]{2,}\s*$/, '')
    .replace(/\s*\*\/\s*$/, '')
    .trim()
}

function parseCodeMarker(line: string): { level: number; text: string } | null {
  const slash = /^(\s*)\/\/\s*(?:(?:--+|===+|---+)\s*)?(.+?)(?:\s*(?:--+|===+|---+))?\s*$/.exec(line)
  if (slash) {
    const text = cleanCodeMarkerTitle(slash[2])
    return text ? { level: markerLevel(slash[1]), text } : null
  }

  const hash = /^(\s*)#\s*(?:(?:--+|===+|---+)\s*)?(.+?)(?:\s*(?:--+|===+|---+))?\s*$/.exec(line)
  if (hash) {
    const text = cleanCodeMarkerTitle(hash[2])
    return text ? { level: markerLevel(hash[1]), text } : null
  }

  const block = /^(\s*)\/\*\s*(?:(?:--+|===+|---+)\s*)?(.+?)(?:\s*(?:--+|===+|---+))?\s*\*\/\s*$/.exec(line)
  if (block) {
    const text = cleanCodeMarkerTitle(block[2])
    return text ? { level: markerLevel(block[1]), text } : null
  }

  return null
}

export function parseDocumentHeadings(model: HeadingTextModel, maxDepth: number): DocumentHeading[] {
  const depth = clampDepth(maxDepth)
  const headings: DocumentHeading[] = []
  const lineCount = model.getLineCount()
  const startLine = frontmatterBodyStart(model, lineCount)

  for (let lineNumber = startLine; lineNumber <= lineCount; lineNumber++) {
    const line = model.getLineContent(lineNumber)
    const nextLine = lineNumber < lineCount ? model.getLineContent(lineNumber + 1) : ''
    const setext = nextLine ? SETEXT_HEADING_RE.exec(nextLine) : null
    // A setext underline applies to a preceding paragraph line, not to an ATX
    // heading. `# Heading` followed by `---` is an ATX heading plus a thematic
    // break (matching ReactMarkdown), so it must not be consumed as setext.
    if (line.trim() && setext && !MARKDOWN_HEADING_RE.test(line)) {
      const level = setext[1].startsWith('=') ? 1 : 2
      if (level <= depth) {
        headings.push({
          line: lineNumber,
          level,
          text: stripMarkdownInlineFormatting(line.trim()),
        })
      }
      lineNumber++
      continue
    }

    const decoratedHashMarker = /^(\s*)#\s+(?:--+|===+|---+|##)/.test(line)
    if (decoratedHashMarker) {
      const marker = parseCodeMarker(line)
      if (marker && marker.level <= depth) {
        headings.push({
          line: lineNumber,
          level: marker.level,
          text: marker.text,
        })
      }
      continue
    }

    const markdown = MARKDOWN_HEADING_RE.exec(line)
    if (markdown) {
      const level = markdown[1].length
      if (level <= depth) {
        headings.push({
          line: lineNumber,
          level,
          text: stripMarkdownInlineFormatting(markdown[2]),
        })
      }
      continue
    }

    const html = HTML_HEADING_RE.exec(line)
    if (html) {
      const level = Number(html[1])
      if (level <= depth) {
        headings.push({
          line: lineNumber,
          level,
          text: decodeHtmlEntities(html[2].replace(/<[^>]+>/g, '').trim()),
        })
      }
      continue
    }

    const marker = parseCodeMarker(line)
    if (marker && marker.level <= depth) {
      headings.push({
        line: lineNumber,
        level: marker.level,
        text: marker.text,
      })
    }
  }

  return headings
}

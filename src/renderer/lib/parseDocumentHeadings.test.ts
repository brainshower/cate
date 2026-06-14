import { describe, expect, it } from 'vitest'
import {
  createHeadingIdTracker,
  parseDocumentHeadings,
  slugifyHeading,
  stripMarkdownInlineFormatting,
} from './parseDocumentHeadings'

function modelFromText(text: string) {
  const lines = text.split('\n')
  return {
    getLineCount: () => lines.length,
    getLineContent: (lineNumber: number) => lines[lineNumber - 1] ?? '',
  }
}

describe('parseDocumentHeadings markdown headings', () => {
  it('T-U-007 parses Markdown H1-H6 with one-based line numbers and levels', () => {
    const headings = parseDocumentHeadings(modelFromText([
      '# One',
      'body',
      '## Two',
      '### Three',
      '#### Four',
      '##### Five',
      '###### Six',
    ].join('\n')), 6)

    expect(headings).toEqual([
      { line: 1, level: 1, text: 'One' },
      { line: 3, level: 2, text: 'Two' },
      { line: 4, level: 3, text: 'Three' },
      { line: 5, level: 4, text: 'Four' },
      { line: 6, level: 5, text: 'Five' },
      { line: 7, level: 6, text: 'Six' },
    ])
  })

  it('T-U-008 filters headings deeper than max depth', () => {
    const headings = parseDocumentHeadings(modelFromText('# One\n## Two\n### Three\n#### Four'), 3)

    expect(headings.map((heading) => heading.text)).toEqual(['One', 'Two', 'Three'])
  })

  it('T-U-009 strips Markdown inline syntax in the required order', () => {
    expect(stripMarkdownInlineFormatting('![Alt text](img.png)')).toBe('Alt text')
    expect(stripMarkdownInlineFormatting('[Link text](https://example.com)')).toBe('Link text')
    expect(stripMarkdownInlineFormatting('**bold** __strong__ ~~strike~~')).toBe('bold strong strike')
    expect(stripMarkdownInlineFormatting('*italic* _em_ `code`')).toBe('italic em code')
    expect(stripMarkdownInlineFormatting('***bold italic***')).toBe('bold italic')

    const headings = parseDocumentHeadings(modelFromText('# **Bold** and [Link](url) with `code`'), 3)
    expect(headings[0].text).toBe('Bold and Link with code')
  })

  it('T-U-010 ignores non-heading Markdown lines with hash characters later in the line', () => {
    const headings = parseDocumentHeadings(modelFromText('value # not heading\n# Real'), 3)

    expect(headings).toEqual([{ line: 2, level: 1, text: 'Real' }])
  })
})

describe('parseDocumentHeadings html and code markers', () => {
  it('T-U-011 parses HTML h1 through h6 headings with attributes', () => {
    const headings = parseDocumentHeadings(modelFromText([
      '<h1>One</h1>',
      '<h2 id="intro" class="x">Intro</h2>',
      '<h6 data-x="1">Six</h6>',
    ].join('\n')), 6)

    expect(headings).toEqual([
      { line: 1, level: 1, text: 'One' },
      { line: 2, level: 2, text: 'Intro' },
      { line: 3, level: 6, text: 'Six' },
    ])
  })

  it('T-U-012 strips nested inline HTML tags from heading text', () => {
    const headings = parseDocumentHeadings(modelFromText(
      '<h2><em>Intro</em> <strong>Bold</strong> <code>Code</code> <span>Span</span> <mark>Mark</mark></h2>',
    ), 3)

    expect(headings[0].text).toBe('Intro Bold Code Span Mark')
  })

  it('T-U-013 parses slash, hash, and block comment section markers with decoration removed', () => {
    const headings = parseDocumentHeadings(modelFromText([
      '// -- Slash Title --',
      '// === Equal Title ===',
      '// ## Hash Style',
      '# --- Shell Title ---',
      '/* === Block Title === */',
    ].join('\n')), 3)

    expect(headings.map((heading) => heading.text)).toEqual([
      'Slash Title',
      'Equal Title',
      'Hash Style',
      'Shell Title',
      'Block Title',
    ])
  })

  it('T-U-014 infers code marker levels from indentation depth and filters by maxDepth', () => {
    const headings = parseDocumentHeadings(modelFromText([
      '// -- Level One --',
      '  // -- Level Two --',
      '    // -- Level Three --',
    ].join('\n')), 2)

    expect(headings).toEqual([
      { line: 1, level: 1, text: 'Level One' },
      { line: 2, level: 2, text: 'Level Two' },
    ])
  })

  it('T-U-015 Covers REQ-017 slugifyHeading lowercases, strips punctuation, preserves hyphens, and strips inline Markdown', () => {
    expect(slugifyHeading('Hello World')).toBe('hello-world')
    expect(slugifyHeading('Hello, World!')).toBe('hello-world')
    expect(slugifyHeading('  Already-hyphenated   heading  ')).toBe('already-hyphenated-heading')
    expect(slugifyHeading('--- Trim Hyphens ---')).toBe('trim-hyphens')
    expect(slugifyHeading('![Alt text](img.png)')).toBe('alt-text')
    expect(slugifyHeading('[Link text](https://example.com)')).toBe('link-text')
    expect(slugifyHeading('**Bold** *Italic* ~~Strike~~')).toBe('bold-italic-strike')
    expect(slugifyHeading('***Bold Italic*** and `Code`')).toBe('bold-italic-and-code')
  })

  it('T-U-016 Covers REQ-017 duplicate heading IDs append deterministic render-order suffixes', () => {
    const nextHeadingId = createHeadingIdTracker()

    expect(nextHeadingId('Section')).toBe('section')
    expect(nextHeadingId('Section')).toBe('section-1')
    expect(nextHeadingId('Section')).toBe('section-2')
    expect(nextHeadingId('**Section**')).toBe('section-3')
    expect(nextHeadingId('Other Section')).toBe('other-section')
    expect(nextHeadingId('Other Section')).toBe('other-section-1')
  })
})

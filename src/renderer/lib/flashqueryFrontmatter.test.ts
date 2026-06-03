import { describe, expect, it } from 'vitest'

import {
  frontmatterToYaml,
  parseFrontmatterYaml,
  stripManagedFrontmatterFields,
} from './flashqueryFrontmatter'

describe('flashqueryFrontmatter helpers', () => {
  it('T-U-008 serializes frontmatter objects to YAML text', () => {
    const yaml = frontmatterToYaml({ title: 'Plan', tags: ['one'] })

    expect(yaml).toContain('title')
    expect(yaml).toContain('tags')
  })

  it('T-U-008 serializes missing frontmatter as empty text', () => {
    expect(frontmatterToYaml(undefined)).toBe('')
  })

  it('T-U-008 parses empty and object YAML', () => {
    expect(parseFrontmatterYaml('')).toEqual({ ok: true, value: {} })
    expect(parseFrontmatterYaml('title: Plan')).toEqual({ ok: true, value: { title: 'Plan' } })
  })

  it('T-U-008 round-trips nested and type-ambiguous frontmatter values', () => {
    const frontmatter = {
      title: 'Plan',
      version: '1.0',
      code: '007',
      flagText: 'true',
      nullText: 'null',
      coords: { lat: 1, lng: 2 },
      sections: [
        { name: 'Intro', visible: true },
        { name: 'Archive', visible: false },
      ],
      tags: ['one', 'two'],
    }

    expect(parseFrontmatterYaml(frontmatterToYaml(frontmatter))).toEqual({
      ok: true,
      value: frontmatter,
    })
  })

  it('T-U-008 rejects non-object YAML', () => {
    const result = parseFrontmatterYaml('- bad')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toEqual(expect.any(String))
  })

  it('T-U-008 filters managed FlashQuery fields with no-op metadata', () => {
    expect(stripManagedFrontmatterFields({ fq_id: 'x', title: 'Plan' })).toEqual({
      frontmatter: { title: 'Plan' },
      removedManagedFieldCount: 1,
      originalFieldCount: 2,
    })
    expect(stripManagedFrontmatterFields({ fq_id: 'x' })).toEqual({
      frontmatter: {},
      removedManagedFieldCount: 1,
      originalFieldCount: 1,
    })
  })
})

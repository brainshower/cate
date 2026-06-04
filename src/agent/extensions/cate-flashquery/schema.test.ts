import { describe, expect, it } from 'vitest'
import { Value } from 'typebox/value'
import { flashQuerySchemaToTypeBox } from './schema'

describe('cate-flashquery schema translation', () => {
  it('T-U-014 translates required object properties to Pi TypeBox schemas', () => {
    const schema = flashQuerySchemaToTypeBox({
      type: 'object',
      required: ['path'],
      properties: {
        path: { type: 'string', description: 'Vault path to read.' },
        preview: { type: 'boolean' },
      },
    })

    expect(Value.Check(schema, { path: 'Docs/Plan.md' })).toBe(true)
    expect(Value.Check(schema, {})).toBe(false)
    expect(Value.Check(schema, { path: 42 })).toBe(false)
    expect((schema as { properties: Record<string, { description?: string }> }).properties.path.description)
      .toBe('Vault path to read.')
  })

  it('T-U-014 translates string, number, integer, boolean, array, enum, nullable, and optional properties', () => {
    const schema = flashQuerySchemaToTypeBox({
      type: 'object',
      required: ['name', 'limit', 'whole', 'enabled', 'tags', 'mode', 'maybe'],
      properties: {
        name: { type: 'string' },
        limit: { type: 'number' },
        whole: { type: 'integer' },
        enabled: { type: 'boolean' },
        tags: { type: 'array', items: { type: 'string' } },
        mode: { enum: ['filesystem', 'mixed', 'semantic'] },
        maybe: { type: ['string', 'null'] },
        optionalFlag: { type: 'boolean' },
      },
    })

    expect(Value.Check(schema, {
      name: 'query',
      limit: 50.5,
      whole: 2,
      enabled: true,
      tags: ['docs'],
      mode: 'mixed',
      maybe: null,
    })).toBe(true)
    expect(Value.Check(schema, {
      name: 'query',
      limit: 50.5,
      whole: 2.5,
      enabled: true,
      tags: ['docs'],
      mode: 'mixed',
      maybe: 'ok',
    })).toBe(false)
    expect(Value.Check(schema, {
      name: 'query',
      limit: 50.5,
      whole: 2,
      enabled: true,
      tags: [12],
      mode: 'mixed',
      maybe: 'ok',
    })).toBe(false)
    expect(Value.Check(schema, {
      name: 'query',
      limit: 50.5,
      whole: 2,
      enabled: true,
      tags: ['docs'],
      mode: 'invalid',
      maybe: 'ok',
    })).toBe(false)
  })

  it('T-U-014 falls back to a safe permissive object schema for unknown or malformed input schemas', () => {
    const malformed = flashQuerySchemaToTypeBox({ type: 'string' })
    const missing = flashQuerySchemaToTypeBox(undefined)

    expect(Value.Check(malformed, { any: 'object' })).toBe(true)
    expect(Value.Check(missing, { nested: { value: 1 } })).toBe(true)
    expect(Value.Check(malformed, 'not-object')).toBe(false)
  })
})

import { Type } from 'typebox'
import type { TSchema } from 'typebox'

type JsonSchemaObject = Record<string, unknown>

export function flashQuerySchemaToTypeBox(schema: unknown): TSchema {
  if (!isPlainObject(schema)) return permissiveObjectSchema()

  const type = schema.type
  if (type !== 'object') return permissiveObjectSchema()

  const properties = isPlainObject(schema.properties) ? schema.properties : {}
  const required = new Set(Array.isArray(schema.required)
    ? schema.required.filter((item): item is string => typeof item === 'string')
    : [])
  const translatedProperties: Record<string, TSchema> = {}

  for (const [key, propertySchema] of Object.entries(properties)) {
    const translated = translatePropertySchema(propertySchema)
    translatedProperties[key] = required.has(key) ? translated : Type.Optional(translated)
  }

  return Type.Object(translatedProperties, {
    additionalProperties: schema.additionalProperties !== false,
    ...schemaOptions(schema),
  })
}

function translatePropertySchema(schema: unknown): TSchema {
  if (!isPlainObject(schema)) return Type.Unknown()

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    const literals = schema.enum
      .filter((value): value is string | number | boolean | null => {
        return typeof value === 'string'
          || typeof value === 'number'
          || typeof value === 'boolean'
          || value === null
      })
      .map((value) => value === null ? Type.Null() : Type.Literal(value))
    if (literals.length === 1) return withOptions(literals[0], schema)
    if (literals.length > 1) return withOptions(Type.Union(literals), schema)
  }

  const types = Array.isArray(schema.type) ? schema.type : [schema.type]
  const nullable = types.includes('null') || schema.nullable === true
  const primaryType = types.find((item) => item !== 'null')
  const translated = translateTypedPropertySchema(primaryType, schema)

  return nullable ? Type.Union([translated, Type.Null()]) : translated
}

function translateTypedPropertySchema(type: unknown, schema: JsonSchemaObject): TSchema {
  switch (type) {
    case 'string':
      return Type.String(schemaOptions(schema))
    case 'number':
      return Type.Number(schemaOptions(schema))
    case 'integer':
      return Type.Integer(schemaOptions(schema))
    case 'boolean':
      return Type.Boolean(schemaOptions(schema))
    case 'array':
      return Type.Array(translatePropertySchema(schema.items), schemaOptions(schema))
    case 'object':
      return flashQuerySchemaToTypeBox(schema)
    default:
      return Type.Unknown(schemaOptions(schema))
  }
}

function permissiveObjectSchema(): TSchema {
  return Type.Object({}, { additionalProperties: true })
}

function withOptions(schema: TSchema, source: JsonSchemaObject): TSchema {
  const options = schemaOptions(source)
  return Object.keys(options).length > 0 ? { ...schema, ...options } as TSchema : schema
}

function schemaOptions(source: JsonSchemaObject): Record<string, unknown> {
  const options: Record<string, unknown> = {}
  if (typeof source.description === 'string') options.description = source.description
  if (typeof source.title === 'string') options.title = source.title
  return options
}

function isPlainObject(value: unknown): value is JsonSchemaObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

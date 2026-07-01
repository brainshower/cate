#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const phaseIds = [
  ...Array.from({ length: 18 }, (_, index) => `T-U-${String(index + 1).padStart(3, '0')}`),
  'T-U-023',
  'T-U-025',
  'T-U-026',
  'T-U-028',
  ...Array.from({ length: 9 }, (_, index) => `T-I-${String(index + 1).padStart(3, '0')}`),
  ...Array.from({ length: 30 }, (_, index) => `T-C-${String(index + 1).padStart(3, '0')}`),
  'T-C-063',
  'T-C-064',
  'T-A-002',
]

const fileRequirements = [
  {
    file: 'src/renderer/panels/SemanticConnectionsPanel.test.tsx',
    ids: [
      'T-C-001',
      'T-C-002',
      'T-C-003',
      'T-C-004',
      'T-C-005',
      'T-C-006',
      'T-C-007',
      'T-C-008',
      'T-C-009',
      'T-C-010',
      'T-C-011',
      'T-C-012',
      'T-C-013',
      'T-C-014',
      'T-C-015',
      'T-C-016',
      'T-C-017',
      'T-C-018',
      'T-C-019',
      'T-C-020',
      'T-C-021',
      'T-C-022',
      'T-C-023',
      'T-C-024',
      'T-C-025',
      'T-C-026',
      'T-C-027',
      'T-C-028',
      'T-C-029',
      'T-C-030',
      'T-C-063',
      'T-C-064',
    ],
  },
  {
    file: 'src/renderer/lib/semanticConnectionsProvider.test.ts',
    ids: [
      'T-U-004',
      'T-U-009',
      'T-U-010',
      'T-U-011',
      'T-U-012',
      'T-U-013',
      'T-U-014',
      'T-U-015',
      'T-U-016',
      'T-U-023',
      'T-U-025',
      'T-U-026',
    ],
  },
]

const searchableFiles = []
const searchableRoots = ['src', '.planning', 'scripts']
const searchableExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.md', '.json'])
const missing = []

function extension(path) {
  const dotIndex = path.lastIndexOf('.')
  return dotIndex === -1 ? '' : path.slice(dotIndex)
}

function collectFiles(path) {
  const stats = statSync(path)
  if (stats.isDirectory()) {
    for (const entry of readdirSync(path)) collectFiles(join(path, entry))
    return
  }
  if (searchableExtensions.has(extension(path))) searchableFiles.push(path)
}

for (const root of searchableRoots) collectFiles(root)
searchableFiles.push('package.json')

const searchableSource = searchableFiles
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n')

for (const id of phaseIds) {
  if (!searchableSource.includes(id)) missing.push(`${id} in Cate source/planning search surface`)
}

for (const requirement of fileRequirements) {
  const source = readFileSync(requirement.file, 'utf8')
  for (const id of requirement.ids) {
    if (!source.includes(id)) missing.push(`${id} in ${requirement.file}`)
  }
}

if (missing.length > 0) {
  console.error('Missing Phase 27 test IDs:')
  for (const item of missing) console.error(`- ${item}`)
  process.exit(1)
}

console.log('Phase 27 test ID coverage OK')

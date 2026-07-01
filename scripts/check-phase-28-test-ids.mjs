#!/usr/bin/env node
import { readFileSync } from 'node:fs'

const phaseDir = '.planning/phases/28-selection-detail-local-filter-chrome-polish-and-e2e-hardenin'

const phaseIds = [
  ...Array.from({ length: 9 }, (_, index) => `T-U-${String(index + 19).padStart(3, '0')}`),
  ...Array.from({ length: 36 }, (_, index) => `T-C-${String(index + 30).padStart(3, '0')}`),
  ...Array.from({ length: 5 }, (_, index) => `T-E-${String(index + 1).padStart(3, '0')}`),
  ...Array.from({ length: 4 }, (_, index) => `T-A-${String(index + 1).padStart(3, '0')}`),
]

const fileRequirements = [
  {
    file: 'src/renderer/lib/semanticConnections.test.ts',
    ids: ['T-U-019', 'T-U-020', 'T-U-021', 'T-U-022', 'T-U-027'],
  },
  {
    file: 'src/renderer/lib/semanticConnectionsProvider.test.ts',
    ids: ['T-U-024'],
  },
  {
    file: 'src/renderer/panels/SemanticConnectionsPanel.test.tsx',
    ids: [
      ...Array.from({ length: 36 }, (_, index) => `T-C-${String(index + 30).padStart(3, '0')}`),
    ],
  },
  {
    file: 'e2e/semantic-connections-graph.spec.ts',
    ids: ['T-E-001', 'T-E-002', 'T-E-003', 'T-E-004', 'T-E-005'],
  },
]

const searchableFiles = [
  `${phaseDir}/28-01-PLAN.md`,
  `${phaseDir}/28-02-PLAN.md`,
  `${phaseDir}/28-03-PLAN.md`,
  `${phaseDir}/28-04-PLAN.md`,
  `${phaseDir}/28-VERIFICATION.md`,
  `${phaseDir}/28-VALIDATION.md`,
  'src/renderer/lib/semanticConnections.test.ts',
  'src/renderer/lib/semanticConnectionsProvider.test.ts',
  'src/renderer/panels/SemanticConnectionsPanel.test.tsx',
  'e2e/semantic-connections-graph.spec.ts',
  'package.json',
]

const missing = []
const searchableSource = searchableFiles
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n')

for (const id of phaseIds) {
  if (!searchableSource.includes(id)) missing.push(`${id} in Phase 28 source/planning search surface`)
}

for (const requirement of fileRequirements) {
  const source = readFileSync(requirement.file, 'utf8')
  for (const id of requirement.ids) {
    if (!source.includes(id)) missing.push(`${id} in ${requirement.file}`)
  }
}

const panelSource = readFileSync('src/renderer/panels/SemanticConnectionsPanel.test.tsx', 'utf8')
const testTitles = [...panelSource.matchAll(/\b(?:it|test)\(\s*(['"`])([\s\S]*?)\1/g)].map((match) => match[2])
const tc030Titles = testTitles.filter((title) => title.includes('T-C-030'))
if (tc030Titles.length !== 1) {
  missing.push(`T-C-030 must appear in exactly one component test title; found ${tc030Titles.length}`)
}
if (tc030Titles[0] && !/selected graph section header and back control/.test(tc030Titles[0])) {
  missing.push('T-C-030 must remain pinned to the REQ-012 selected-section header/back-control test')
}

if (missing.length > 0) {
  console.error('Missing or ambiguous Phase 28 test IDs:')
  for (const item of missing) console.error(`- ${item}`)
  process.exit(1)
}

console.log('Phase 28 test ID coverage OK')

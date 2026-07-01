import { test, expect } from '@playwright/test'
import {
  launchApp,
  closeApp,
  seedTerminal,
  resetViewport,
  titleBarCentre,
  getNodeRect,
  dragMouse,
} from './fixtures/electron-app'
import type { ElectronApplication, Page } from 'playwright'

let app: ElectronApplication
let page: Page

test.beforeEach(async () => {
  ;({ electronApp: app, mainWindow: page } = await launchApp())
  await resetViewport(page)
})
test.afterEach(async () => closeApp(app))

test('non-canvas tab is accepted into a canvas-node mini-dock', async () => {
  // Regression guard: the rejection above must be specific to canvas — a
  // terminal tab still docks normally.
  const target = await seedTerminal(page, { x: 700, y: 200 })
  const source = await seedTerminal(page, { x: 200, y: 200 })
  const grab = await titleBarCentre(page, source)
  const tRect = await getNodeRect(page, target)
  const dropPoint = { x: tRect!.x + tRect!.width / 2, y: tRect!.y + 10 }
  await dragMouse(page, grab!, dropPoint, { steps: 20, pauseAtEnd: 50 })
  await page.waitForTimeout(150)
  // Terminal source was tabbed into target — its canvas-node is gone.
  const sourceStill = await page.$(`[data-node-id="${source}"]`)
  expect(sourceStill).toBeNull()
})

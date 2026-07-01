import { test, expect } from '@playwright/test'
import {
  launchApp,
  closeApp,
  seedTerminal,
  setZoom,
  titleBarCentre,
  getNodeRect,
  getNodeOrigin,
  waitForGhost,
  dragMouse,
} from './fixtures/electron-app'
import type { ElectronApplication, Page } from 'playwright'

let app: ElectronApplication
let page: Page

test.beforeEach(async () => {
  ;({ electronApp: app, mainWindow: page } = await launchApp())
})
test.afterEach(async () => closeApp(app))

/* Drag-move regression coverage.
 * Reads `before` via the harness immediately before mousedown so any focus-pan
 * has already settled. Asserts canvas-origin delta — invariant under sidebar
 * width and viewport offset.
 */

test('moves a node within the canvas (zoom 1)', async () => {
  const nodeId = await seedTerminal(page, { x: 400, y: 300 })
  const before = await getNodeOrigin(page, nodeId)
  const grab = await titleBarCentre(page, nodeId)
  await dragMouse(page, grab!, { x: grab!.x + 200, y: grab!.y + 150 })
  await page.waitForTimeout(150)
  const after = await getNodeOrigin(page, nodeId)
  expect(after!.x - before!.x).toBeCloseTo(200, -1)
  expect(after!.y - before!.y).toBeCloseTo(150, -1)
})

test('zoom-aware: canvas-space delta == screen-delta ÷ zoom (zoom 2)', async () => {
  const nodeId = await seedTerminal(page, { x: 400, y: 300 })
  await setZoom(page, 2)
  await page.waitForTimeout(400)
  const grab = await titleBarCentre(page, nodeId)
  const before = await getNodeOrigin(page, nodeId)
  await dragMouse(page, grab!, { x: grab!.x + 200, y: grab!.y + 100 })
  await page.waitForTimeout(150)
  const after = await getNodeOrigin(page, nodeId)
  expect(after).not.toEqual(before)
  expect(after!.x - before!.x).toBeCloseTo(100, -1)
  expect(after!.y - before!.y).toBeCloseTo(50, -1)
})

test('ghost follows cursor with the grab offset (zoom 1)', async () => {
  const nodeId = await seedTerminal(page, { x: 400, y: 300 })
  const rect = await getNodeRect(page, nodeId)
  expect(rect).not.toBeNull()
  const grabOffset = { x: 50, y: 6 }
  const grabPoint = { x: rect!.x + grabOffset.x, y: rect!.y + grabOffset.y }
  await page.mouse.move(grabPoint.x, grabPoint.y)
  await page.mouse.down()
  await page.mouse.move(grabPoint.x + 250, grabPoint.y + 180, { steps: 15 })
  const ghost = await waitForGhost(page)
  expect(ghost).not.toBeNull()
  const cursorNow = { x: grabPoint.x + 250, y: grabPoint.y + 180 }
  // Ghost top-left = cursor - grabOffset (at zoom 1). Allow 2px slop for the
  // overlay's borders/padding rounding.
  expect(Math.abs(ghost!.x - (cursorNow.x - grabOffset.x))).toBeLessThan(3)
  expect(Math.abs(ghost!.y - (cursorNow.y - grabOffset.y))).toBeLessThan(3)
  await page.mouse.up()
})

test('source node is hidden while dragging', async () => {
  const nodeId = await seedTerminal(page, { x: 400, y: 300 })
  const grab = await titleBarCentre(page, nodeId)
  await page.mouse.move(grab!.x, grab!.y)
  await page.mouse.down()
  await page.mouse.move(grab!.x + 100, grab!.y + 80, { steps: 10 })
  await page.waitForTimeout(250) // wait for opacity transition (150ms) + slop
  const opacity = await page.evaluate(
    (id) => getComputedStyle(document.querySelector(`[data-node-id="${id}"]`)!).opacity,
    nodeId,
  )
  expect(parseFloat(opacity)).toBe(0)
  const snapshot = await page.evaluate(() => window.__cateE2E!.dragSnapshot())
  expect(snapshot).toMatchObject({
    isDragging: true,
    sourceKind: 'canvas-node',
    sourceNodeId: nodeId,
  })
  await page.mouse.up()
})

test('tiny drag inside dead zone does not move the node', async () => {
  const nodeId = await seedTerminal(page, { x: 400, y: 300 })
  const before = await getNodeOrigin(page, nodeId)
  const grab = await titleBarCentre(page, nodeId)
  await dragMouse(page, grab!, { x: grab!.x + 2, y: grab!.y + 1 })
  await page.waitForTimeout(80)
  const after = await getNodeOrigin(page, nodeId)
  expect(after!.x).toBeCloseTo(before!.x, 1)
  expect(after!.y).toBeCloseTo(before!.y, 1)
})

test('primary shortcut + Z restores position after a drag', async () => {
  const nodeId = await seedTerminal(page, { x: 400, y: 300 })
  const before = await getNodeOrigin(page, nodeId)
  const grab = await titleBarCentre(page, nodeId)
  await dragMouse(page, grab!, { x: grab!.x + 200, y: grab!.y + 150 })
  await page.waitForTimeout(150)
  const moved = await getNodeOrigin(page, nodeId)
  expect(moved!.x - before!.x).toBeCloseTo(200, -1)
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Z' : 'Control+Z')
  await page.waitForTimeout(200)
  const restored = await getNodeOrigin(page, nodeId)
  expect(restored!.x).toBeCloseTo(before!.x, 0)
  expect(restored!.y).toBeCloseTo(before!.y, 0)
})

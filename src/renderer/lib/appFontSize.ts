const DEFAULT_APP_FONT_SIZE = 16
const MIN_APP_FONT_SIZE = 12
const MAX_APP_FONT_SIZE = 24

export function clampAppFontSize(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_APP_FONT_SIZE
  return Math.min(Math.max(Math.round(value), MIN_APP_FONT_SIZE), MAX_APP_FONT_SIZE)
}

export function applyAppFontSize(value: number, root: HTMLElement = document.documentElement): void {
  root.style.fontSize = `${clampAppFontSize(value)}px`
}

// =============================================================================
// did-fail-load classification for the BrowserPanel <webview>.
//
// Lives outside the React component so unit tests can import it without
// dragging Electron/React into the test environment.
// =============================================================================

const ERR_ABORTED = -3

export interface DidFailLoadEvent {
  errorCode: number
  errorDescription?: string
  isMainFrame?: boolean
}

export function pageLoadErrorFrom(event: DidFailLoadEvent): string | null {
  if (event.errorCode === ERR_ABORTED) return null
  if (event.isMainFrame === false) return null
  return event.errorDescription || 'Failed to load page'
}

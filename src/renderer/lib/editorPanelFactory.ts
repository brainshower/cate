import type { PanelState } from '../../shared/types'
import { parseVaultUri } from '../../shared/flashqueryUri'

export function editorTitleForPath(filePath: string | undefined): string {
  const sourcePath = filePath ? parseVaultUri(filePath)?.vaultPath ?? filePath : undefined
  return sourcePath ? sourcePath.split(/[\\/]/).pop() ?? 'Untitled' : 'Untitled'
}

export function createEditorPanelState(filePath: string | undefined): PanelState {
  return {
    id: crypto.randomUUID(),
    type: 'editor',
    title: editorTitleForPath(filePath),
    isDirty: false,
    filePath,
  }
}

import { vi } from 'vitest'

type Listener = () => void
type MockUri = { raw: string; toString: () => string }
type MockModel = {
  uri?: MockUri
  value: string
  disposed: boolean
  getValue: () => string
  setValue: (value: string) => void
  isDisposed: () => boolean
  dispose: () => void
}
type MockEditor = {
  model: MockModel | null
  focusListeners: Listener[]
  changeListeners: Listener[]
  getValue: () => string
  getModel: () => MockModel | null
  setModel: (model: MockModel) => void
  onDidFocusEditorText: (listener: Listener) => { dispose: () => void }
  onDidChangeModelContent: (listener: Listener) => { dispose: () => void }
  updateOptions: ReturnType<typeof vi.fn>
  layout: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
}

const models = new Map<string, MockModel>()
const editors: MockEditor[] = []
const diffEditors: any[] = []
const uriFileCalls: string[] = []
const uriParseCalls: string[] = []

const uriFrom = (raw: string): MockUri => ({ raw, toString: () => raw })

const makeModel = (value: string, uri?: MockUri): MockModel => {
  const model: MockModel = {
    uri,
    value,
    disposed: false,
    getValue: () => model.value,
    setValue: (next) => { model.value = next },
    isDisposed: () => model.disposed,
    dispose: () => { model.disposed = true },
  }
  if (uri) models.set(uri.toString(), model)
  return model
}

const makeEditor = (): MockEditor => {
  const editor: MockEditor = {
    model: null,
    focusListeners: [],
    changeListeners: [],
    getValue: () => editor.model?.getValue() ?? '',
    getModel: () => editor.model,
    setModel: (model) => { editor.model = model },
    onDidFocusEditorText: (listener) => {
      editor.focusListeners.push(listener)
      return { dispose: () => { editor.focusListeners = editor.focusListeners.filter((item) => item !== listener) } }
    },
    onDidChangeModelContent: (listener) => {
      editor.changeListeners.push(listener)
      return { dispose: () => { editor.changeListeners = editor.changeListeners.filter((item) => item !== listener) } }
    },
    updateOptions: vi.fn(),
    layout: vi.fn(),
    dispose: vi.fn(),
  }
  editors.push(editor)
  return editor
}

export const __mock = {
  models,
  editors,
  diffEditors,
  uriFileCalls,
  uriParseCalls,
  reset: () => {
    models.clear()
    editors.length = 0
    diffEditors.length = 0
    uriFileCalls.length = 0
    uriParseCalls.length = 0
  },
  latestEditor: () => editors[editors.length - 1],
  setLatestValue: (value: string) => {
    const editor = editors[editors.length - 1]
    editor?.model?.setValue(value)
    editor?.changeListeners.forEach((listener) => listener())
  },
  focusLatestEditor: () => {
    const editor = editors[editors.length - 1]
    editor?.focusListeners.forEach((listener) => listener())
  },
  getModelByRawUri: (raw: string) => models.get(raw),
}

export const Uri = {
  file: vi.fn((filePath: string) => {
    uriFileCalls.push(filePath)
    return uriFrom(`file://${filePath}`)
  }),
  parse: vi.fn((value: string) => {
    uriParseCalls.push(value)
    return uriFrom(value)
  }),
}

export const languages = {
  getLanguages: vi.fn(() => [
    { id: 'markdown', extensions: ['.md', '.mdx'] },
    { id: 'typescript', extensions: ['.ts'] },
  ]),
}

export const editor = {
  defineTheme: vi.fn(),
  setTheme: vi.fn(),
  create: vi.fn(() => makeEditor()),
  createDiffEditor: vi.fn(() => {
    const diffEditor = {
      layout: vi.fn(),
      updateOptions: vi.fn(),
      setModel: vi.fn(),
      getModel: vi.fn(() => ({ original: makeModel(''), modified: makeModel('') })),
      dispose: vi.fn(),
    }
    diffEditors.push(diffEditor)
    return diffEditor
  }),
  createModel: vi.fn((value: string, _language?: string, uri?: MockUri) => makeModel(value, uri)),
  getModel: vi.fn((uri: MockUri) => models.get(uri.toString()) ?? null),
}

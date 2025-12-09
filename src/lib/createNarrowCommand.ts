import {
  ExtensionContext,
  QuickPickItem,
  Range,
  Selection,
  TextEditor,
  TextEditorRevealType,
  ThemeColor,
  Uri,
  window,
  workspace,
} from 'vscode'
import { getOptions } from '../getOptions'

type InferContext<T> = T extends () => infer R
  ? R extends Promise<infer U>
    ? Exclude<U, false>
    : Exclude<R, false>
  : never

type InferItem<T> = T extends (context: any) => infer R
  ? R extends Promise<Array<infer U>>
    ? U
    : R extends Array<infer U>
    ? U
    : never
  : never

type NarrowConfig<TSetup extends () => any, TPrepareItems extends (context: any) => any> = {
  setup: TSetup
  prepareItems: TPrepareItems
  getInitialSearchTerm?: (context: InferContext<TSetup>) => string
  onPreview: (item: InferItem<TPrepareItems>, context: InferContext<TSetup>) => void | Promise<void>
  onAccept: (
    item: InferItem<TPrepareItems>,
    context: InferContext<TSetup>,
    searchValue: string,
    options: ReturnType<typeof getOptions>,
  ) => void | Promise<void>
  placeholder?: string
}

const decorationType = window.createTextEditorDecorationType({
  backgroundColor: new ThemeColor('editor.selectionBackground'),
  isWholeLine: true,
})

// Helper functions for common preview/accept behaviors
export function previewLine<TContext extends { editor: TextEditor }>(
  item: QuickPickItem & { index: number },
  context: TContext,
) {
  const { editor } = context
  const options = getOptions()
  const REVEAL_TYPE =
    TextEditorRevealType[options.activeLineViewportRevealType]

  const lineRange = new Range(item.index, 0, item.index, item.label.length)

  editor.setDecorations(decorationType, [lineRange])
  editor.revealRange(lineRange, REVEAL_TYPE)
}

export function acceptLine<TContext extends { editor: TextEditor }>(
  item: QuickPickItem & { index: number },
  context: TContext,
  searchValue: string,
  options: ReturnType<typeof getOptions>,
) {
  const { editor } = context
  const REVEAL_TYPE =
    TextEditorRevealType[options.activeLineViewportRevealType]

  const line = item.index
  let character = 0

  switch (options.cursorLocationAfterAccept) {
    case 'startOfLine': {
      character = 0
      break
    }
    case 'startOfLineIgnoreWhitespace': {
      const leadingWhitespaceLength =
        item.label.length - item.label.trimStart().length
      character = leadingWhitespaceLength
      break
    }
    case 'startOfMatch': {
      const matchPosition = item.label
        .toLocaleLowerCase()
        .indexOf(searchValue.toLocaleLowerCase())
      character = matchPosition === -1 ? 0 : matchPosition
      break
    }
  }

  const newSelection = new Selection(line, character, line, character)
  editor.selection = newSelection
  editor.revealRange(newSelection, REVEAL_TYPE)
}

export async function previewFile<TContext>(
  item: QuickPickItem & { filePath: string },
  context: TContext,
) {
  if (!item.filePath) {
    return
  }

  try {
    const doc = await workspace.openTextDocument(Uri.file(item.filePath))
    await window.showTextDocument(doc, { preview: true, preserveFocus: true })
  } catch {
    // File might not exist
  }
}

export async function acceptFile<TContext>(
  item: QuickPickItem & { filePath: string },
  context: TContext,
) {
  if (!item.filePath) {
    return
  }

  try {
    const doc = await workspace.openTextDocument(Uri.file(item.filePath))
    await window.showTextDocument(doc, { preview: false })
  } catch {
    window.showErrorMessage(`Could not open file: ${item.label}`)
  }
}

export function createNarrowCommand<
  TSetup extends () => any,
  TPrepareItems extends (context: InferContext<TSetup>) => any,
>(config: NarrowConfig<TSetup, TPrepareItems>) {
  return (context: ExtensionContext) => {
    return async (...commandArgs: any) => {
      // Setup phase - acquire context
      const setupContext = await config.setup()
      if (setupContext === false) {
        return
      }

      const options = getOptions()

      // Initial search term
      const initialInputValue = config.getInitialSearchTerm
        ? config.getInitialSearchTerm(setupContext)
        : ''

      // Create QuickPick
      const quickPick = window.createQuickPick<InferItem<TPrepareItems>>()
      quickPick.placeholder = config.placeholder || 'Type to narrow'
      quickPick.value = initialInputValue
      quickPick.matchOnDescription = false
      quickPick.matchOnDetail = false
      // This turns off sorting of quick pick items, allowing us to keep the source code order
      // https://github.com/microsoft/vscode/commit/e9c0aeb8b00db16dad3b11426d78a64ff18b5dc2
      ;(quickPick as any).sortByLabel = options.shouldSortByLabel
      quickPick.busy = true
      quickPick.show()

      // Prepare items
      const items = await config.prepareItems(setupContext)
      quickPick.items = items

      quickPick.busy = false

      let isFirstActiveChange = true

      // Event handlers
      context.subscriptions.push(
        quickPick.onDidChangeActive(([item]) => {
          if (isFirstActiveChange) {
            isFirstActiveChange = false
            return
          }

          if (!item) {
            return
          }

          config.onPreview(item, setupContext)
        }),

        quickPick.onDidAccept(() => {
          const [item] = quickPick.selectedItems
          if (!item) {
            return
          }

          config.onAccept(item, setupContext, quickPick.value, options)
          quickPick.hide()
        }),

        quickPick.onDidHide(() => {
          quickPick.dispose()
        }),
      )
    }
  }
}

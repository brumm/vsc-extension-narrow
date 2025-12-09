import {
  ExtensionContext,
  QuickPickItem,
  Range,
  Selection,
  TextEditor,
  TextEditorRevealType,
  ThemeColor,
  window,
} from 'vscode'
import { getOptions } from '../getOptions'

export type NarrowItem = { index: number } & QuickPickItem

type NarrowConfig<TContext = void> = {
  setup?: (
    editor: TextEditor,
  ) => Promise<boolean | TContext | void> | boolean | TContext | void
  prepareItems: (
    editor: TextEditor,
    context: TContext,
  ) => Promise<NarrowItem[]> | NarrowItem[]
  getInitialSearchTerm?: (editor: TextEditor, context: TContext) => string
  getCursorPosition?: (
    item: NarrowItem,
    searchValue: string,
    options: ReturnType<typeof getOptions>,
  ) => { line: number; character: number }
  placeholder?: string
}

const decorationType = window.createTextEditorDecorationType({
  backgroundColor: new ThemeColor('editor.selectionBackground'),
  isWholeLine: true,
})

export function createNarrowCommand<TContext = void>(
  config: NarrowConfig<TContext>,
) {
  return (context: ExtensionContext) => {
    return async (...commandArgs: any) => {
      const editor = window.activeTextEditor
      if (!editor) {
        return
      }

      // Setup phase - can validate and provide context
      let setupContext: TContext | undefined
      if (config.setup) {
        const result = await config.setup(editor)
        if (result === false) {
          return
        }
        // If setup returns an object, use it as context
        if (result !== true && result !== undefined) {
          setupContext = result as TContext
        }
      }

      const options = getOptions()
      const REVEAL_TYPE =
        TextEditorRevealType[options.activeLineViewportRevealType]

      // Initial search term
      const initialInputValue = config.getInitialSearchTerm
        ? config.getInitialSearchTerm(editor, setupContext as TContext)
        : ''

      // Create QuickPick
      const quickPick = window.createQuickPick<NarrowItem>()
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
      const items = await config.prepareItems(editor, setupContext as TContext)
      quickPick.items = items

      // Set initial active item
      const initialActiveItem = items.find(
        (item) => item.index === editor.selection.active.line,
      )
      if (initialActiveItem) {
        quickPick.activeItems = [initialActiveItem]
      }

      quickPick.busy = false

      // State management
      const selectionAtActivation = editor.selection
      let newSelection = selectionAtActivation
      let isFirstActiveChange = true

      // Default cursor position strategy (respects config)
      const defaultGetCursorPosition = (
        item: NarrowItem,
        searchValue: string,
        options: ReturnType<typeof getOptions>,
      ) => {
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

        return { line, character }
      }

      const getCursorPosition =
        config.getCursorPosition || defaultGetCursorPosition

      // Event handlers
      context.subscriptions.push(
        quickPick.onDidChangeActive(([item]) => {
          if (isFirstActiveChange) {
            isFirstActiveChange = false
            return
          }

          if (!editor || !item) {
            return
          }

          const startLine = item.index
          const startCharacter = 0
          const endLine = item.index
          const endCharacter = item.label.length

          const lineRange = new Range(
            startLine,
            startCharacter,
            endLine,
            endCharacter,
          )

          editor.setDecorations(decorationType, [lineRange])
          editor.revealRange(lineRange, REVEAL_TYPE)

          isFirstActiveChange = false
        }),

        quickPick.onDidChangeSelection(([item]) => {
          const { line, character } = getCursorPosition(
            item,
            quickPick.value,
            options,
          )
          newSelection = new Selection(line, character, line, character)
        }),

        quickPick.onDidAccept(() => {
          editor.selection = newSelection
          editor.revealRange(editor.selection, REVEAL_TYPE)
          quickPick.hide()
        }),

        quickPick.onDidHide(() => {
          quickPick.dispose()
          editor.setDecorations(decorationType, [])

          if (editor.selection.isEqual(selectionAtActivation)) {
            editor.revealRange(editor.selection, REVEAL_TYPE)
          }
        }),
      )
    }
  }
}

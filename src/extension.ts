import {
  EndOfLine,
  ExtensionContext,
  QuickPickItem,
  Range,
  Selection,
  TextEditorRevealType,
  ThemeColor,
  commands,
  window,
  workspace,
} from 'vscode'

type Item = { index: number } & QuickPickItem
type Options = {
  shouldSortByLabel: boolean
  useWordUnderCursorAsInitialSearchTerm: boolean
  cursorLocationAfterAccept:
    | 'startOfLine'
    | 'startOfLineIgnoreWhitespace'
    | 'startOfMatch'
  activeLineViewportRevealType:
    | 'Default'
    | 'InCenter'
    | 'InCenterIfOutsideViewport'
    | 'AtTop'
}

const decorationType = window.createTextEditorDecorationType({
  backgroundColor: new ThemeColor('editor.selectionBackground'),
  isWholeLine: true,
})

const getOptions = () => {
  const config = workspace.getConfiguration('narrow')
  const options = {
    shouldSortByLabel: config.get('sortOrder', 'default') === 'default',
    useWordUnderCursorAsInitialSearchTerm: config.get(
      'useWordUnderCursorAsInitialSearchTerm',
      true,
    ),
    cursorLocationAfterAccept: config.get(
      'cursorLocationAfterAccept',
      'startOfLine',
    ),
    activeLineViewportRevealType: config.get(
      'activeLineViewportRevealType',
      'InCenter',
    ),
  }
  return options as Options
}

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand('narrow.narrow-file', () => {
      const editor = window.activeTextEditor
      if (!editor) {
        return
      }

      const options = getOptions()
      const eol = editor.document.eol === EndOfLine.LF ? '\n' : '\r\n'
      const REVEAL_TYPE =
        TextEditorRevealType[options.activeLineViewportRevealType]

      const selectionAtActivation = editor.selection
      let newSelection = selectionAtActivation
      let initialInputValue = ''

      if (
        selectionAtActivation.isEmpty &&
        options.useWordUnderCursorAsInitialSearchTerm
      ) {
        const range = editor.document.getWordRangeAtPosition(
          selectionAtActivation.active,
        )
        if (range) {
          initialInputValue = editor.document.getText(range)
        } else {
          initialInputValue = ''
        }
      } else {
        initialInputValue = editor.document.getText(selectionAtActivation)
      }

      const quickPick = window.createQuickPick<Item>()

      quickPick.placeholder = 'Type to narrow file'
      quickPick.matchOnDescription = false
      quickPick.matchOnDetail = false
      quickPick.value = initialInputValue

      // This turns off sorting of quick pick items, allowing us to keep the source code order
      // No idea why it's missing from the types
      // https://github.com/microsoft/vscode/commit/e9c0aeb8b00db16dad3b11426d78a64ff18b5dc2
      ;(quickPick as any).sortByLabel = options.shouldSortByLabel

      quickPick.busy = true
      quickPick.show()

      quickPick.items = editor.document
        .getText()
        .split(eol)
        .map((line, index) => ({
          label: line,
          index,
        }))
        .filter(({ label }) => Boolean(label.trim()))

      const initialActiveItem = quickPick.items.find(
        (item) => item.index === editor.selection.active.line,
      )
      if (initialActiveItem) {
        quickPick.activeItems = [initialActiveItem]
      }

      quickPick.busy = false

      let isFirstActiveChange = true

      context.subscriptions.push(
        quickPick.onDidChangeActive(([item]) => {
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

          if (!isFirstActiveChange) {
            editor.setDecorations(decorationType, [lineRange])
            editor.revealRange(lineRange, REVEAL_TYPE)
          }

          isFirstActiveChange = false
        }),

        quickPick.onDidChangeSelection(([item]) => {
          let anchorLine: number = item.index
          let anchorCharacter: number
          let activeLine: number = item.index
          let activeCharacter: number

          switch (options.cursorLocationAfterAccept) {
            case 'startOfLine': {
              anchorCharacter = 0
              activeCharacter = 0
              break
            }
            case 'startOfLineIgnoreWhitespace': {
              const leadingWhitespaceLength =
                item.label.length - item.label.trimStart().length
              anchorCharacter = leadingWhitespaceLength
              activeCharacter = leadingWhitespaceLength
              break
            }
            case 'startOfMatch': {
              const matchPosition = item.label
                .toLocaleLowerCase()
                .indexOf(quickPick.value.toLocaleLowerCase())

              if (matchPosition === -1) {
                // fall back to start of line
                anchorCharacter = 0
                activeCharacter = 0
                break
              }

              anchorCharacter = matchPosition
              activeCharacter = matchPosition
              break
            }
          }

          newSelection = new Selection(
            anchorLine,
            anchorCharacter,
            activeLine,
            activeCharacter,
          )
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
    }),
  )
}

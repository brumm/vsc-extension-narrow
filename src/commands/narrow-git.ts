import simpleGit from 'simple-git'
import {
  ExtensionContext,
  QuickPickItem,
  QuickPickItemKind,
  Range,
  Selection,
  TextEditorRevealType,
  ThemeColor,
  ThemeIcon,
  window,
  workspace,
} from 'vscode'
import { getOptions } from '../getOptions'
import { parseDiff } from '../lib/parseDiff'
import assert = require('assert')

const decorationType = window.createTextEditorDecorationType({
  backgroundColor: new ThemeColor('editor.selectionBackground'),
  isWholeLine: true,
})

export function narrowGit(context: ExtensionContext) {
  return (...commandArgs: any) => narrowGitInner(context)
}

async function narrowGitInner(context: ExtensionContext) {
  const editor = window.activeTextEditor
  if (!editor) {
    return
  }

  const folder = workspace.getWorkspaceFolder(editor.document.uri)
  const path = folder?.uri.fsPath
  if (!path) {
    return
  }

  const repository = simpleGit(path, { trimmed: true })
  const filePath = editor.document.uri.fsPath
  const status = (
    await repository.raw(['status', '--porcelain', filePath])
  ).slice(0, 1)

  if (status !== 'M') {
    return
  }

  const options = getOptions()
  const quickPick = window.createQuickPick<Item>()

  quickPick.placeholder = 'Type to narrow file'
  quickPick.matchOnDescription = false
  quickPick.matchOnDetail = false
  // This turns off sorting of quick pick items, allowing us to keep the source code order
  // https://github.com/microsoft/vscode/commit/e9c0aeb8b00db16dad3b11426d78a64ff18b5dc2
  ;(quickPick as any).sortByLabel = options.shouldSortByLabel

  quickPick.busy = true
  quickPick.show()

  const diffs = parseDiff(await repository.diff(['--unified=0', filePath]))
  const REVEAL_TYPE = TextEditorRevealType[options.activeLineViewportRevealType]

  const selectionAtActivation = editor.selection
  let newSelection = selectionAtActivation

  let items: Item[] = []
  for (const diff of diffs) {
    for (const chunk of diff.chunks) {
      items.push({
        kind: QuickPickItemKind.Separator,
        index: 0,
        label: '',
      })

      for (const change of chunk.changes) {
        switch (change.type) {
          case 'add': {
            items.push({
              label: change.content.slice(1),
              iconPath: new ThemeIcon('diff-insert'),
              index: change.ln - 1,
            })
            break
          }
        }
      }
    }
  }

  quickPick.items = items
  items = []

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
      let anchorLine: number = item.index
      let activeLine: number = item.index
      newSelection = new Selection(anchorLine, 0, activeLine, 0)
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

type Item = { index: number } & QuickPickItem

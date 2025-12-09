import * as Diff from 'diff'
import * as path from 'path'
import simpleGit from 'simple-git'
import {
  QuickPickItem,
  QuickPickItemKind,
  Selection,
  TextEditor,
  TextEditorRevealType,
  ThemeIcon,
  window,
  workspace,
} from 'vscode'
import { createNarrowCommand, previewLine } from '../lib/createNarrowCommand'
import { getOptions } from '../getOptions'
import { parseDiff } from '../lib/parseDiff'

export const narrowGit = createNarrowCommand({
  placeholder: 'Type to narrow file',

  setup: async () => {
    const editor = window.activeTextEditor
    if (!editor) {
      return false
    }

    const folder = workspace.getWorkspaceFolder(editor.document.uri)
    const workspacePath = folder?.uri.fsPath
    if (!workspacePath) {
      return false
    }

    const repository = simpleGit(workspacePath, { trimmed: true })
    const filePath = editor.document.uri.fsPath

    // Get relative path from workspace root
    const relativePath = path.relative(workspacePath, filePath)

    // Check if file is tracked by git
    try {
      await repository.raw(['ls-files', '--error-unmatch', relativePath])
    } catch {
      return false
    }

    return { editor, repository, relativePath }
  },

  prepareItems: async (context) => {
    const { editor, repository, relativePath } = context

    // Get HEAD version
    let headContent = ''
    try {
      headContent = await repository.show([`HEAD:${relativePath}`])
    } catch {
      // File might be new, treat as empty
      headContent = ''
    }

    // Get current editor content (includes unsaved changes)
    const currentContent = editor.document.getText()

    // Generate unified diff
    const unifiedDiff = Diff.createPatch(
      relativePath,
      headContent,
      currentContent,
      'HEAD',
      'current',
      { context: 0 },
    )

    const diffs = parseDiff(unifiedDiff)

    const items = []
    for (const diff of diffs) {
      for (const chunk of diff.chunks) {
        items.push({
          kind: QuickPickItemKind.Separator,
          index: 0,
          label: '',
        })

        for (const change of chunk.changes) {
          if (change.type === 'add') {
            items.push({
              label: change.content.slice(1),
              iconPath: new ThemeIcon('diff-insert'),
              index: change.ln - 1,
            })
          }
        }
      }
    }
    return items
  },

  onPreview: previewLine,

  onAccept: (item, context) => {
    const { editor } = context
    const options = getOptions()
    const REVEAL_TYPE =
      TextEditorRevealType[options.activeLineViewportRevealType]

    const newSelection = new Selection(item.index, 0, item.index, 0)
    editor.selection = newSelection
    editor.revealRange(newSelection, REVEAL_TYPE)
  },
})

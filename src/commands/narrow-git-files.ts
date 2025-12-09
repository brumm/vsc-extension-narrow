import * as Diff from 'diff'
import simpleGit from 'simple-git'
import {
  QuickPickItem,
  QuickPickItemKind,
  Selection,
  TextEditorRevealType,
  ThemeIcon,
  Uri,
  window,
  workspace,
} from 'vscode'
import { createNarrowCommand, previewFile } from '../lib/createNarrowCommand'
import { parseDiff } from '../lib/parseDiff'

export const narrowGitFiles = createNarrowCommand({
  placeholder: 'Type to narrow git changed files',

  setup: async () => {
    const workspaceFolder = workspace.workspaceFolders?.[0]
    if (!workspaceFolder) {
      return false
    }

    const workspacePath = workspaceFolder.uri.fsPath
    const repository = simpleGit(workspacePath, { trimmed: true })

    try {
      await repository.status()
      return { repository, workspacePath }
    } catch {
      return false
    }
  },

  prepareItems: async (context) => {
    const { repository, workspacePath } = context
    const status = await repository.status()

    const items = []

    // Modified files
    if (status.modified.length > 0) {
      items.push({
        kind: QuickPickItemKind.Separator,
        label: 'Modified',
        filePath: '',
      })
      for (const file of status.modified) {
        items.push({
          label: file,
          iconPath: new ThemeIcon('diff-modified'),
          filePath: `${workspacePath}/${file}`,
        })
      }
    }

    // Added files
    if (status.created.length > 0) {
      items.push({
        kind: QuickPickItemKind.Separator,
        label: 'Added',
        filePath: '',
      })
      for (const file of status.created) {
        items.push({
          label: file,
          iconPath: new ThemeIcon('diff-added'),
          filePath: `${workspacePath}/${file}`,
        })
      }
    }

    // Renamed files
    if (status.renamed.length > 0) {
      items.push({
        kind: QuickPickItemKind.Separator,
        label: 'Renamed',
        filePath: '',
      })
      for (const file of status.renamed) {
        items.push({
          label: file.to || file.from,
          description: file.from !== file.to ? `from ${file.from}` : undefined,
          iconPath: new ThemeIcon('diff-renamed'),
          filePath: `${workspacePath}/${file.to || file.from}`,
        })
      }
    }

    return items
  },

  onPreview: async (item, context) => {
    if (!item.filePath) {
      return
    }

    try {
      const doc = await workspace.openTextDocument(Uri.file(item.filePath))
      const editor = await window.showTextDocument(doc, {
        preview: true,
        preserveFocus: true,
      })

      await jumpToFirstChange(editor, item.label, context.repository)
    } catch {
      // File might not exist
    }
  },

  onAccept: async (item, context) => {
    if (!item.filePath) {
      return
    }

    try {
      const doc = await workspace.openTextDocument(Uri.file(item.filePath))
      const editor = await window.showTextDocument(doc, { preview: false })

      await jumpToFirstChange(editor, item.label, context.repository)
    } catch (error) {
      window.showErrorMessage(`Could not open file: ${item.label}`)
    }
  },
})

async function jumpToFirstChange(
  editor: any,
  relativePath: string,
  repository: ReturnType<typeof simpleGit>,
) {
  try {
    // Get HEAD version
    let headContent = ''
    try {
      headContent = await repository.show([`HEAD:${relativePath}`])
    } catch {
      // New file, no HEAD version
      return
    }

    // Get current file content
    const currentContent = editor.document.getText()

    // Generate diff
    const unifiedDiff = Diff.createPatch(
      relativePath,
      headContent,
      currentContent,
      'HEAD',
      'current',
      { context: 0 },
    )

    const diffs = parseDiff(unifiedDiff)

    // Find first addition
    for (const diff of diffs) {
      for (const chunk of diff.chunks) {
        for (const change of chunk.changes) {
          if (change.type === 'add') {
            const line = change.ln - 1
            const newSelection = new Selection(line, 0, line, 0)
            editor.selection = newSelection
            editor.revealRange(
              newSelection,
              TextEditorRevealType.InCenterIfOutsideViewport,
            )
            return
          }
        }
      }
    }
  } catch {
    // If we can't get the diff, just leave cursor where it is
  }
}

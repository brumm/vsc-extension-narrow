import simpleGit from 'simple-git'
import { QuickPickItemKind, ThemeIcon, workspace } from 'vscode'
import { createNarrowCommand } from '../lib/createNarrowCommand'
import { parseDiff } from '../lib/parseDiff'

type GitContext = {
  repository: ReturnType<typeof simpleGit>
  filePath: string
}

export const narrowGit = createNarrowCommand<GitContext>({
  placeholder: 'Type to narrow file',

  setup: async (editor) => {
    const folder = workspace.getWorkspaceFolder(editor.document.uri)
    const path = folder?.uri.fsPath
    if (!path) {
      return false
    }

    const repository = simpleGit(path, { trimmed: true })
    const filePath = editor.document.uri.fsPath
    const status = (
      await repository.raw(['status', '--porcelain', filePath])
    ).slice(0, 1)

    if (status !== 'M') {
      return false
    }

    return { repository, filePath }
  },

  prepareItems: async (editor, context) => {
    const { repository, filePath } = context
    const diffs = parseDiff(await repository.diff(['--unified=0', filePath]))

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

  getCursorPosition: (item) => ({ line: item.index, character: 0 }),
})

import { DiagnosticSeverity, languages, ThemeIcon } from 'vscode'
import { createNarrowCommand, NarrowItem } from '../lib/createNarrowCommand'

type ProblemItem = NarrowItem & { character: number }

export const narrowProblems = createNarrowCommand({
  placeholder: 'Type to narrow problems',

  setup: (editor) => {
    const diagnostics = languages.getDiagnostics(editor.document.uri)
    const errors = diagnostics.filter(
      (d) => d.severity <= DiagnosticSeverity.Warning,
    )
    return errors.length > 0
  },

  prepareItems: (editor) => {
    const diagnostics = languages.getDiagnostics(editor.document.uri)
    const errors = diagnostics.filter(
      (d) => d.severity <= DiagnosticSeverity.Warning,
    )

    return errors.map((diagnostic) => {
      const line = editor.document.lineAt(diagnostic.range.start.line)
      const severity =
        diagnostic.severity === DiagnosticSeverity.Error ? 'error' : 'warning'

      return {
        label: line.text.trim(),
        description: diagnostic.message,
        iconPath: new ThemeIcon(severity),
        index: diagnostic.range.start.line,
        character: diagnostic.range.start.character,
      } as ProblemItem
    })
  },

  getCursorPosition: (item) => ({
    line: item.index,
    character: (item as ProblemItem).character || 0,
  }),
})

import {
  DiagnosticSeverity,
  languages,
  QuickPickItem,
  Selection,
  TextEditor,
  TextEditorRevealType,
  ThemeIcon,
  window,
} from 'vscode'
import { createNarrowCommand, previewLine } from '../lib/createNarrowCommand'
import { getOptions } from '../getOptions'

export const narrowProblems = createNarrowCommand({
  placeholder: 'Type to narrow problems',

  setup: () => {
    const editor = window.activeTextEditor
    if (!editor) {
      return false
    }

    const diagnostics = languages.getDiagnostics(editor.document.uri)
    const errors = diagnostics.filter(
      (d) => d.severity <= DiagnosticSeverity.Warning,
    )

    if (errors.length === 0) {
      return false
    }

    return { editor }
  },

  prepareItems: (context) => {
    const diagnostics = languages.getDiagnostics(context.editor.document.uri)
    const errors = diagnostics.filter(
      (d) => d.severity <= DiagnosticSeverity.Warning,
    )

    return errors.map((diagnostic) => {
      const line = context.editor.document.lineAt(diagnostic.range.start.line)
      const severity =
        diagnostic.severity === DiagnosticSeverity.Error ? 'error' : 'warning'

      return {
        label: line.text.trim(),
        description: diagnostic.message,
        iconPath: new ThemeIcon(severity),
        index: diagnostic.range.start.line,
        character: diagnostic.range.start.character,
      }
    })
  },

  onPreview: previewLine,

  onAccept: (item, context) => {
    const { editor } = context
    const options = getOptions()
    const REVEAL_TYPE =
      TextEditorRevealType[options.activeLineViewportRevealType]

    const character = item.character || 0
    const newSelection = new Selection(item.index, character, item.index, character)
    editor.selection = newSelection
    editor.revealRange(newSelection, REVEAL_TYPE)
  },
})

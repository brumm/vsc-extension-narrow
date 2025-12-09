import { EndOfLine, QuickPickItem, TextEditor, window } from 'vscode'
import {
  acceptLine,
  createNarrowCommand,
  previewLine,
} from '../lib/createNarrowCommand'
import { getOptions } from '../getOptions'

export const narrowFile = createNarrowCommand({
  placeholder: 'Type to narrow file',

  setup: () => {
    const editor = window.activeTextEditor
    if (!editor) {
      return false
    }

    const eol = editor.document.eol === EndOfLine.LF ? '\n' : '\r\n'
    return { editor, eol }
  },

  prepareItems: (context) => {
    return context.editor.document
      .getText()
      .split(context.eol)
      .map((line, index) => ({
        label: line,
        index,
      }))
      .filter(({ label }) => Boolean(label.trim()))
  },

  getInitialSearchTerm: (context) => {
    const options = getOptions()
    const selection = context.editor.selection

    if (selection.isEmpty && options.useWordUnderCursorAsInitialSearchTerm) {
      const range = context.editor.document.getWordRangeAtPosition(
        selection.active,
      )
      return range ? context.editor.document.getText(range) : ''
    }
    return context.editor.document.getText(selection)
  },

  onPreview: previewLine,
  onAccept: acceptLine,
})

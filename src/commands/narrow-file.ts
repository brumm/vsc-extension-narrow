import { EndOfLine } from 'vscode'
import { createNarrowCommand } from '../lib/createNarrowCommand'
import { getOptions } from '../getOptions'

type FileContext = { eol: string }

export const narrowFile = createNarrowCommand<FileContext>({
  placeholder: 'Type to narrow file',

  setup: (editor) => {
    const eol = editor.document.eol === EndOfLine.LF ? '\n' : '\r\n'
    return { eol }
  },

  prepareItems: (editor, context) => {
    return editor.document
      .getText()
      .split(context.eol)
      .map((line, index) => ({
        label: line,
        index,
      }))
      .filter(({ label }) => Boolean(label.trim()))
  },

  getInitialSearchTerm: (editor) => {
    const options = getOptions()
    const selection = editor.selection

    if (selection.isEmpty && options.useWordUnderCursorAsInitialSearchTerm) {
      const range = editor.document.getWordRangeAtPosition(selection.active)
      return range ? editor.document.getText(range) : ''
    }
    return editor.document.getText(selection)
  },
})

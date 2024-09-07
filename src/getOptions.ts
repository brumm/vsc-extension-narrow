import { workspace } from 'vscode'

export function getOptions() {
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

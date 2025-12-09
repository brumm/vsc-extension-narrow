import { ExtensionContext, commands } from 'vscode'
import { narrowFile } from './commands/narrow-file'
import { narrowGit } from './commands/narrow-git'
import { narrowGitFiles } from './commands/narrow-git-files'
import { narrowProblems } from './commands/narrow-problems'

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand('narrow.narrow-file', narrowFile(context)),
    commands.registerCommand('narrow.narrow-git', narrowGit(context)),
    commands.registerCommand(
      'narrow.narrow-git-files',
      narrowGitFiles(context),
    ),
    commands.registerCommand('narrow.narrow-problems', narrowProblems(context)),
  )
}

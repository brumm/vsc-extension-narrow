import { ExtensionContext, commands } from 'vscode'
import { narrowFile } from './commands/narrow-file'
import { narrowGit } from './commands/narrow-git'

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand('narrow.narrow-file', narrowFile(context)),
    commands.registerCommand('narrow.narrow-git', narrowGit(context)),
  )
}

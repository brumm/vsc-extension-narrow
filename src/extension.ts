import { ExtensionContext, commands } from 'vscode'
import { narrowFile } from './commands/narrow-file'

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand('narrow.narrow-file', narrowFile(context)),
  )
}

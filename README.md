# narrow

Code navigation inspired by [atom-narrow](https://github.com/t9md/atom-narrow)

Running `narrow.narrow-file` shows a QuickPick listing all lines in your current file. Type to narrow down to matching lines. Hit enter to move your cursor to the selected line.

Narrow does not assign keyboard shortcuts by default.
Open your keyboard shortcuts json (`Preferences: OpenKeyboard Shortcuts (JSON)`) and paste this snippet to get started:

```json
{
  "key": "ctrl+f",
  "command": "narrow.narrow-file",
  "when": "editorTextFocus"
}
```

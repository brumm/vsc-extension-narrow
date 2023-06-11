# narrow

Code navigation inspired by [atom-narrow](https://github.com/t9md/atom-narrow)

Running `narrow.narrow-file` shows a QuickPick listing all lines in your current file. Type to narrow down to matching lines. Hit enter to move your cursor to the selected line.

![Screen Recording 2023-06-10 at 16 24 58](https://github.com/brumm/vsc-extension-narrow/assets/170500/27022fb7-f522-4a49-9a26-e3c1af4c76d7)


## Keyboard Shortcuts

Narrow does not assign keyboard shortcuts by default.
Open your keyboard shortcuts json (`Preferences: Open Keyboard Shortcuts (JSON)`) and paste this snippet to get started:

```json
{
  "key": "ctrl+f",
  "command": "narrow.narrow-file",
  "when": "editorTextFocus"
}
```

## Options

![Screenshot 2023-06-10 at 16 21 18](https://github.com/brumm/vsc-extension-narrow/assets/170500/c5869bcd-5db8-45b9-94fe-5dfac13404e9)

# narrow

Code navigation inspired by [atom-narrow](https://github.com/t9md/atom-narrow)

Running `narrow.narrow-file` shows a QuickPick listing of all lines in your current file. Type to narrow down to matching lines. Hit enter to move your cursor to the selected line.

![Screen Recording 2023-06-10 at 16 24 58](https://github.com/brumm/vsc-extension-narrow/assets/170500/27022fb7-f522-4a49-9a26-e3c1af4c76d7)

Running `narrow.narrow-git` shows a QuickPick listing of all lines which were added since your last commit to quickly jump to your most recent work in a file.

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

```json
{
  "key": "ctrl+g",
  "command": "narrow.narrow-git",
  "when": "editorTextFocus"
}
```

## Options

![Screenshot 2024-07-27 at 15 30 10](https://github.com/user-attachments/assets/223aa684-3396-4728-b95b-fc98c778b1bb)

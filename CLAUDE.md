# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VSCode extension for code navigation using fuzzy search. Two commands:
- `narrow.narrow-file`: Search all lines in current file
- `narrow.narrow-git`: Search only git additions since last commit

Inspired by atom-narrow.

## Commands

**Build and watch:**
```bash
yarn compile        # Compile TypeScript
yarn watch          # Watch mode for development
```

**Lint:**
```bash
yarn lint           # Run ESLint
```

**Test extension:**
Use "Run Extension" launch config in VSCode (F5) - compiles and opens extension host window.

**Package:**
```bash
yarn vscode:prepublish
```

## Architecture

**Entry point:** `src/extension.ts`
- Registers two commands in `activate()` function
- Each command registered with factory function from respective command file

**Command pattern:**
Commands in `src/commands/` follow factory pattern:
1. Export factory function that takes `ExtensionContext`
2. Factory returns command handler
3. Handler creates QuickPick UI with live preview
4. User types to filter, cursor preview updates in real-time
5. Accept moves cursor to selected line

**QuickPick behavior:**
Both commands use custom `sortByLabel` property to preserve source order when `narrow.sortOrder` is "source". This uses undocumented VSCode API.

**Configuration:**
`src/getOptions.ts` reads workspace config for:
- Sort order (match score vs source order)
- Word under cursor as initial search term
- Cursor position after accept
- Viewport reveal behavior

**Git integration:**
`narrow-git` uses `simple-git` to:
1. Check file status (`git status --porcelain`)
2. Get unified diff (`git diff --unified=0`)
3. Parse with `parse-diff` library
4. Show only added lines in QuickPick

**Diff parsing:**
`src/lib/parseDiff.ts` wraps `parse-diff` library and normalizes `/dev/null` to `null`.

## TypeScript Setup

- Strict mode enabled
- Target ES2020
- Output to `out/` directory
- No return type annotations (per project style)

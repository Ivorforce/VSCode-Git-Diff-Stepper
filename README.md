# git-diff-stepper README

A plugin to step through the git history of a file using `git-diff`.

This is not in active development: VSCode doesn't expose a way to create editors in insets, and that [won't change in the near future](https://github.com/microsoft/vscode/issues/153198). Check out the standalone application instead: [Git Diff Stepper](https://github.com/Ivorforce/Git-Diff-Stepper).

## Features

Open a file and run `Git Diff Stepper: Begin` from the command palette. Then, run `Git Diff Stepper: Next` and `Git Diff Stepper: Previouis` to step through the iterations. I recommend setting shortcuts for these actions.

## Requirements

This extension can only be run in VSCode Insiders, because it uses the proposal `editorInsets`. Its status is tracked [here](https://github.com/microsoft/vscode/issues/85682).

## Extension Settings

None, yet.

## Known Issues

- Added lines are not highlighted like code.
- Changes are not animated.
- Backwards stepping is not possible.
- It should be possible to compare your version to a specific other version.
- The file should be edit-locked.

## Release Notes

### 0.1

Basic Functionality.

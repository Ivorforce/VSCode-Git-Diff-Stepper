// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import DiffEditorInfo from './logStepper';

export let infosOfControlledEditors: DiffEditorInfo[] = [];

export const addDecorationType = vscode.window.createTextEditorDecorationType({
	overviewRulerColor: 'green',
	overviewRulerLane: vscode.OverviewRulerLane.Right,
	isWholeLine: true,
	backgroundColor: "rgba(0, 255, 0, 0.1)",
});

export const delDecorationType = vscode.window.createTextEditorDecorationType({
	overviewRulerColor: 'red',
	overviewRulerLane: vscode.OverviewRulerLane.Right,
	isWholeLine: true,
	backgroundColor: "rgba(255, 0, 0, 0.1)",
});

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('git-diff-stepper.openFileHistory', async () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		let activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			vscode.window.showInformationMessage(`No open file!`);
			return;
		}

		let newInfo = await DiffEditorInfo.create(activeEditor);
		infosOfControlledEditors.push(newInfo);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('git-diff-stepper.previousVersion', async () => {
		let info = infoForEditor(vscode.window.activeTextEditor);
		if (!info) { return; }
		await info.stepPrevious();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('git-diff-stepper.nextVersion', async () => {
		let info = infoForEditor(vscode.window.activeTextEditor);
		if (!info) { return; }
		await info.stepNext();
	}));
}

export function infoForEditor(editor: vscode.TextEditor | undefined) : DiffEditorInfo | undefined {
	for (let info of infosOfControlledEditors) {
		if (info.annotator.editorRef === editor) {
			return info;
		}
	}
	
	return undefined;
}

// This method is called when your extension is deactivated
export function deactivate() {}

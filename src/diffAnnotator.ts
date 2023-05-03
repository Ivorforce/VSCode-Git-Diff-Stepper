import * as vscode from 'vscode';
import { addDecorationType, delDecorationType } from './extension';

// Note: Idxs start at 1
export const diffHeaderRegexInline = /@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;
export const diffHeaderRegex = /\n@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/g;

function range (start: number, end: number) { return [...Array(1+end-start).keys()].map(v => start+v) } 

function endOfDocument(document: vscode.TextDocument) : vscode.Position {
    return document.lineAt(document.lineCount - 1).rangeIncludingLineBreak.end;
}

export default class DiffAnnotator {
    public editorRef: vscode.TextEditor;
    public currentDiff?: string;

    constructor(editorRef: vscode.TextEditor) {
        this.editorRef = editorRef;
    }

    public async discardCurrentDiff() {
        this.currentDiff = undefined;
        this.editorRef.setDecorations(delDecorationType, []);
        this.editorRef.setDecorations(addDecorationType, []);
        // TODO Animate
    }

    public async applyCurrentDiff() {
        if (!this.currentDiff) {
            return;
        }

        let doc = this.editorRef.document;
        let edits: [vscode.Range, string][] = []; 

        let lines = this.currentDiff.split("\n");

        for (let i = 0; i < lines.length; i++) {
            let infoResult = diffHeaderRegexInline.exec(lines[i]);
            if (!infoResult) {
                continue;
            }

			let oldFilePos = Number(infoResult[1]) - 1;
			let delCount = infoResult[2] ? Number(infoResult[2]) : 1;
            if (delCount === 0) {
                // Bugged: https://lore.kernel.org/git/?t=20230503204901
                oldFilePos += 1;
            }

			let newFilePos = Number(infoResult[3]) - 1;
			let addCount = infoResult[4] ? Number(infoResult[4]) : 1;

            let diffPatchAddStart = i + 1 + delCount;
            let replacement = addCount > 0 ? lines.slice(diffPatchAddStart, diffPatchAddStart + addCount).map(x => x.slice(1)).join("\n") + "\n" : "";

            // If we need to insert at the end of the file, just use the last line's end
            let removeStart = doc.lineCount === oldFilePos ? endOfDocument(doc) : doc.lineAt(oldFilePos).rangeIncludingLineBreak.start;

            if (delCount > 0) {
                // Use the start of the next line if available, otherwise just delete till the end.
                let removeEnd = doc.lineAt(oldFilePos + delCount - 1).rangeIncludingLineBreak.end;
    
                edits.push([new vscode.Range(removeStart, removeEnd), replacement]);    
            }
            else {
                edits.push([new vscode.Range(removeStart, removeStart), replacement]);    
            }
		}

        await this.editorRef.edit(editBuilder => {
            for (let [range, replacement] of edits) {
                editBuilder.replace(range, replacement);
            }
        });

        this.currentDiff = undefined;
        this.editorRef.setDecorations(addDecorationType, []);

        // TODO Animate Away
        this.editorRef.setDecorations(delDecorationType, []);
    }

    public async setCurrentDiff(diff: string) {
        if (this.currentDiff) {
            this.discardCurrentDiff();
        }

        this.currentDiff = diff;

        // Insert annotations

		const adds: [number, number][] = [];
		const dels: vscode.Range[] = [];

		var infoResult;
		while((infoResult = diffHeaderRegex.exec(diff)) !== null) {
			let oldFilePos = Number(infoResult[1]) - 1;
			let delCount = infoResult[2] ? Number(infoResult[2]) : 1;

			let newFilePos = Number(infoResult[3]) - 1;
			let addCount = infoResult[4] ? Number(infoResult[4]) : 1;

            if (delCount > 0) {
                dels.push(new vscode.Range(
                    this.editorRef.document.lineAt(oldFilePos).range.start,
                    this.editorRef.document.lineAt(oldFilePos + delCount - 1).range.end
                ));
            }
            // TODO Animate in Add-Annotations
		}

		this.editorRef.setDecorations(delDecorationType, dels);
    }
}

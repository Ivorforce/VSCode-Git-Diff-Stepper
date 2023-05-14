import * as vscode from 'vscode';
import { delDecorationType, mediaUri } from './extension';
import Patch from './patch';

function range (start: number, end: number) { return [...Array(1+end-start).keys()].map(v => start+v) } 

function endOfDocument(document: vscode.TextDocument) : vscode.Position {
    return document.lineAt(document.lineCount - 1).rangeIncludingLineBreak.end;
}

export default class DiffAnnotator {
    public styleUri: vscode.Uri;
    public editorRef: vscode.TextEditor;
    public currentDiff: Patch[] = [];

    public insets: vscode.WebviewEditorInset[] = [];

    constructor(styleUri: vscode.Uri, editorRef: vscode.TextEditor) {
        this.styleUri = styleUri;
        this.editorRef = editorRef;
    }

    public async discardCurrentDiff() {
        this.currentDiff = [];
        this.editorRef.setDecorations(delDecorationType, []);
        // TODO Animate
    }

    public async applyCurrentDiff() {
        if (!this.currentDiff) {
            return;
        }

        let doc = this.editorRef.document;
        let edits: [vscode.Range, string][] = []; 

        for (let patch of this.currentDiff) {
            // TODO Should probably be eol sensitive...
            let replacement = patch.addCount > 0 ? patch.addedLines.join("\n") + "\n" : "";

            // If we need to insert at the end of the file, just use the last line's end
            let removeStart = doc.lineCount === patch.oldFilePos ? endOfDocument(doc) : doc.lineAt(patch.oldFilePos).rangeIncludingLineBreak.start;

            if (patch.delCount > 0) {
                // Use the start of the next line if available, otherwise just delete till the end.
                let removeEnd = doc.lineAt(patch.oldFilePos + patch.delCount - 1).rangeIncludingLineBreak.end;
    
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

        this.currentDiff = [];

        // TODO Animate Away
        this.editorRef.setDecorations(delDecorationType, []);

        // Will auto-remove themselves on discard.
        this.insets.forEach(x => x.dispose());
        this.insets = [];
    }

    public async setCurrentDiff(patches: Patch[]) {
        if (this.currentDiff) {
            this.discardCurrentDiff();
        }

        this.currentDiff = patches;

        // Insert annotations

		const dels: vscode.Range[] = [];

		for (let patch of patches) {
            if (patch.delCount > 0) {
                dels.push(new vscode.Range(
                    this.editorRef.document.lineAt(patch.oldFilePos).range.start,
                    this.editorRef.document.lineAt(patch.oldFilePos + patch.delCount - 1).range.end
                ));
            }
            if (patch.addCount > 0) {
                const inset = vscode.window.createWebviewTextEditorInset(this.editorRef, patch.oldFilePos, patch.addCount, {
                    // Only allow the webview to access resources in our extension's media directory
                    localResourceRoots: [mediaUri]
                  });
                const myStyle = inset.webview.asWebviewUri(this.styleUri);
                console.log(this.styleUri);
                console.log(myStyle);
                inset.webview.html = `
                <!DOCTYPE html>
                <html>
                    <head>
                      <link href="${myStyle}" rel="stylesheet" />
                    </head>
                    <body>
                      ${patch.addedLines.join("<br/>")}
                    </body>
                 </html>
        `;
                this.insets.push(inset);
            }
		}

		this.editorRef.setDecorations(delDecorationType, dels);
    }
}

import * as vscode from 'vscode';
import path = require('path');
import util = require('util');
import DiffAnnotator from './diffAnnotator';
const exec = util.promisify(require('child_process').exec);


export default class DiffEditorInfo {
    public annotator: DiffAnnotator;

    public filePath: string;

    public currentVersion: string;
    public nextVersion?: string;
    
    constructor(annotator: DiffAnnotator, filePath: string, currentVersion: string) {
        this.annotator = annotator;
        this.filePath = filePath;
        this.currentVersion = currentVersion;
    }

    public static async getCommitList(filePath: string): Promise<string[]> {
        let parent = path.dirname(filePath);
		let filename = path.basename(filePath);

        var { stdout, stderr } = await exec(`git log --pretty=format:%h -- ${filename}`, {cwd: parent});
		return stdout.split("\n").reverse();  // Commit list is "top is latest"
    }

    public static async getFileAtVersion(filePath: string, versionHash: string): Promise<string> {
        let parent = path.dirname(filePath);
		let filename = path.basename(filePath);

		var { stdout, stderr } = await exec(`git show ${versionHash}:./${filename}`, {cwd: parent});
		return stdout;
    }

    public static async create(fromEditor: vscode.TextEditor): Promise<DiffEditorInfo> {
		let filePath = fromEditor.document.uri.fsPath;

		const commitList = await this.getCommitList(filePath);
        const textBefore = await this.getFileAtVersion(filePath, commitList[0]);
		
		const document = await vscode.workspace.openTextDocument({
			content: textBefore,
			language: fromEditor.document.languageId,
		});
		const newEditor = await vscode.window.showTextDocument(document);
        const annotator = new DiffAnnotator(newEditor);
        
        const info = new DiffEditorInfo(annotator, filePath, commitList[0]);

        return info;
    }

    public async setNextVersion(nextVersion: string) {
        console.log(`Next: ${nextVersion}`);
        let parent = path.dirname(this.filePath);
		let filename = path.basename(this.filePath);

        this.nextVersion = nextVersion;
        const { stdout, stderr } = await exec(`git --no-pager diff -U0 ${this.currentVersion} ${nextVersion} -- ${filename}`, {cwd: parent});
        const diff = stdout;

		await this.annotator.setCurrentDiff(diff);
    }

    public async stepNext() {
        if (this.nextVersion) {
            await this.annotator.applyCurrentDiff();
            this.currentVersion = this.nextVersion;
            this.nextVersion = undefined;
            return;
        }
        else {
            // Find the next version to step to
            const commitList = await DiffEditorInfo.getCommitList(this.filePath);
            const currentVersionIdx = commitList.indexOf(this.currentVersion);
            if (currentVersionIdx + 1 < commitList.length) {
                await this.setNextVersion(commitList[currentVersionIdx + 1]);
            }
        }        
    }

    public async stepPrevious() {
        if (this.nextVersion) {
            this.nextVersion = undefined;
            await this.annotator.discardCurrentDiff();
            return;  // TODO Remove decorations, animate
        }
        else {
            // TODO Instead, replay animations backwards
            const commitList = await DiffEditorInfo.getCommitList(this.filePath);
            const currentVersionIdx = commitList.indexOf(this.currentVersion);
            if (currentVersionIdx + 1 < commitList.length) {
                await this.setNextVersion(commitList[currentVersionIdx - 1]);
            }
        }
    }
}

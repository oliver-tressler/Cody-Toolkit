import * as path from "path";
import * as fs from "fs";
import * as vsc from "vscode";
/**
 * Utility object for working with files.
 */
export class FileInfo {
	public get extension(): string {
		return this.parsedAbsoluteFilePath.ext;
	}
	public get name(): string {
		return this.parsedAbsoluteFilePath.name;
	}
	public get dir(): string {
		return this.isForwardSlash
			? this.toForwardSlash(this.parsedAbsoluteFilePath.dir)
			: this.toBackwardSlash(this.parsedAbsoluteFilePath.dir);
	}
	public get file(): string {
		return this.absoluteFilePath;
	}
	public get relativeDir(): string {
		return this.isForwardSlash
			? this.toForwardSlash(path.relative(this.workspacePath, this.dir))
			: this.toBackwardSlash(path.relative(this.workspacePath, this.dir));
	}
	public get relativeFile(): string {
		return this.isForwardSlash
			? this.toForwardSlash(path.relative(this.workspacePath, this.file))
			: this.toBackwardSlash(path.relative(this.workspacePath, this.file));
	}
	public get exists(): boolean {
		return fs.existsSync(this.file);
	}
	public get workspaceRoot(): string {
		return this.workspacePath;
	}
	private parsedAbsoluteFilePath: path.ParsedPath;
	private absoluteFilePath: string;

	public asBackwardSlash(): FileInfo {
		return new FileInfo(this.file, this.workspaceRoot, false);
	}

	public asForwardSlash(): FileInfo {
		return new FileInfo(this.file, this.workspaceRoot, true);
	}

	constructor(absoluteFilePath: string, private workspacePath: string, private isForwardSlash?: boolean) {
		this.isForwardSlash = isForwardSlash ?? true;
		this.absoluteFilePath = this.isForwardSlash
			? this.toForwardSlash(absoluteFilePath)
			: this.toBackwardSlash(absoluteFilePath);
		if (workspacePath == null) {
			this.workspacePath = this.isForwardSlash
				? this.toForwardSlash(vsc.workspace.workspaceFolders![0].uri.fsPath)
				: this.toBackwardSlash(vsc.workspace.workspaceFolders![0].uri.fsPath);
		} else if (workspacePath == "") {
			this.workspacePath = "";
		} else {
			this.workspacePath = isForwardSlash
				? this.toForwardSlash(workspacePath)
				: this.toBackwardSlash(workspacePath);
		}
		this.parsedAbsoluteFilePath = path.parse(this.absoluteFilePath);
	}

	private toForwardSlash(string: string, escapeSpaces?: boolean): string {
		return string
			.replace("\\", "/")
			.split(String.fromCharCode(92))
			.join("/")
			.split("/")
			.map((dir) => ((escapeSpaces ?? true) && !dir.match(/^".+"$/) && dir.includes(" ") ? '"' + dir + '"' : dir))
			.join("/");
	}

	private toBackwardSlash(string: string, escapeSpaces?: boolean): string {
		return string
			.replace(/\//g, "\\")
			.split("\\")
			.map((dir) => ((escapeSpaces ?? true) && !dir.match(/^".+"$/) && dir.includes(" ") ? '"' + dir + '"' : dir))
			.join("\\");
	}
}

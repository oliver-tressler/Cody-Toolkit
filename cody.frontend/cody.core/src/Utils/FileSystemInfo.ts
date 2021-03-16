import * as vsc from "vscode";
import * as fs from "fs";
import * as path from "path";
export abstract class FileSystemInfo<T extends FileSystemInfo<T>> {
	protected isForwardSlash: boolean;
	protected absolutePath: string;
	private parsedAbsolutePath: path.ParsedPath;
	private projectRootPath: string;

	public get name(): string {
		return this.parsedAbsolutePath.name;
	}
	public get projectRoot(): string {
		return this.projectRootPath;
	}
	public get exists(): boolean {
		return fs.existsSync(this.absolutePath);
	}
	protected get relativePath(): string {
		const relativePath = path.relative(this.projectRoot, this.absolutePath);
		return this.isForwardSlash ? this.toForwardSlash(relativePath) : this.toBackwardSlash(relativePath);
	}

	constructor(absolutePath: string, projectRoot?: string, isForwardSlash?: boolean) {
		this.isForwardSlash = isForwardSlash ?? true;
		this.absolutePath = isForwardSlash ? this.toForwardSlash(absolutePath) : this.toBackwardSlash(absolutePath);
		if (projectRoot == null) {
			this.projectRootPath = isForwardSlash
				? this.toForwardSlash(vsc.workspace.workspaceFolders![0].uri.fsPath)
				: this.toBackwardSlash(vsc.workspace.workspaceFolders![0].uri.fsPath);
		} else if (projectRoot == "") {
			this.projectRootPath = projectRoot;
		} else {
			this.projectRootPath = isForwardSlash
				? this.toForwardSlash(projectRoot)
				: this.toBackwardSlash(projectRoot);
		}
		this.parsedAbsolutePath = path.parse(this.absolutePath);
	}

	protected toForwardSlash(string: string, escapeSpaces?: boolean): string {
		return string
			.replace("\\", "/")
			.split(String.fromCharCode(92))
			.join("/")
			.split("/")
			.map((dir) => ((escapeSpaces ?? true) && !dir.match(/^".+"$/) && dir.includes(" ") ? '"' + dir + '"' : dir))
			.join("/");
	}

	protected toBackwardSlash(string: string, escapeSpaces?: boolean): string {
		return string
			.replace(/\//g, "\\")
			.split("\\")
			.map((dir) => ((escapeSpaces ?? true) && !dir.match(/^".+"$/) && dir.includes(" ") ? '"' + dir + '"' : dir))
			.join("\\");
	}

	public abstract asBackwardSlash(): T;

	public abstract asForwardSlash(): T;
}

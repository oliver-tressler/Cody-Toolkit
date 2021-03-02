import { FileSystemInfo } from "./FileSystemInfo";
/**
 * Utility object for working with directories.
 */
export class DirectoryInfo extends FileSystemInfo<DirectoryInfo> {
	public get dir(): string {
		return this.absolutePath;
	}

	public get relativeDir(): string {
		return this.relativePath;
	}

	constructor(absoluteDirectoryPath: string, workspacePath?: string, isForwardSlash?: boolean) {
		super(absoluteDirectoryPath, workspacePath, isForwardSlash);
	}

	public asBackwardSlash(): DirectoryInfo {
		return new DirectoryInfo(this.absolutePath, this.projectRoot, false);
	}

	public asForwardSlash(): DirectoryInfo {
		return new DirectoryInfo(this.absolutePath, this.projectRoot, true);
	}
}

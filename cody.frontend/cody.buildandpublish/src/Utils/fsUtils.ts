import * as path from "path";
import * as vscode from "vscode";

/**
 * Check if a given dir is equal to or a subdirectory of another dir.
 * @param parent fsPath (dir)
 * @param child fsPath (dir)
 */
export function isSubDirOrEqualDir(parent: string, child: string) {
	const parentPath = path.parse(parent);
	const childPath = path.parse(child);
	if (parentPath.dir === childPath.dir) {
		return true;
	}
	const rel = path.relative(parent, child);
	return rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * Finds and parses typescript config file.
 * @param filePath Entry point for searching the config file
 * @returns Path to config file and parsed compilerOptions
 */
function getTypescriptConfig(filePath: string) {
	const ts = require("typescript");
	const tsConfigPath = ts.findConfigFile(filePath, ts.sys.fileExists, "tsconfig.json");
	if (tsConfigPath == null) {
		// TODO: Ask user for tsconfig file
		return undefined;
	}
	const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
	if (configFile == null || configFile.error != null) {
		// Unable to read config file
		return undefined;
	}
	const compilerOptions = ts.parseJsonConfigFileContent(configFile.config, ts.sys, "./");
	return [tsConfigPath, { ...ts.getDefaultCompilerOptions(), ...compilerOptions }] as const;
}

/**
 * Get the root dir, src dir, and out dir configuration for a specific file.
 * @param filePath The file for which to determine out and src dir
 * @returns rootDir (either workspace folder or directory with tsconfig), srcDir (rootDir specified in tsconfig),
 * 	outDir(outDir specified in tsconfig). All paths returned as absolute paths. Returns undefined if workspace and
 * 	tsconfig cannot be determined.
 */
export function getDirs(filePath: string) {
	const workSpaceDir = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath))?.uri.fsPath;
	const [tsConfigPath, tsConfig] = getTypescriptConfig(filePath) ?? [undefined, undefined];
	if (!tsConfigPath || !workSpaceDir) return undefined;
	const rootDir = path.normalize(workSpaceDir ?? path.parse(tsConfigPath).dir);
	const srcDir = tsConfig?.options.rootDir;
	const outDir = tsConfig?.options.outDir;
	return {
		rootDir: path.normalize(rootDir),
		srcDir: srcDir ? path.resolve(rootDir, srcDir) : undefined,
		outDir: outDir ? path.resolve(rootDir, outDir) : undefined,
	};
}

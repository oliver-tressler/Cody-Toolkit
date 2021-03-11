import * as path from "path";
import * as vscode from "vscode";
import { findConfigFile, parseJsonConfigFileContent, readConfigFile, sys } from "typescript";
import { last } from "./arrayUtils";
/**
 * Check if a given dir is equal to or a subdirectory of another dir
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

function getTypescriptConfig(filePath: string) {
	const tsConfigPath = findConfigFile(filePath, sys.fileExists, "tsconfig.json");
	if (tsConfigPath == null) {
		// TODO: Ask user for tsconfig file
		return undefined;
	}
	const configFile = readConfigFile(tsConfigPath, sys.readFile);
	if (configFile == null || configFile.error != null) {
		// Unable to read config file
		return undefined;
	}
	const compilerOptions = parseJsonConfigFileContent(configFile.config, sys, "./");
	return [tsConfigPath, compilerOptions] as const;
}

export function getDirs(filePath: string) {
	const [tsConfigPath, tsConfig] = getTypescriptConfig(filePath) ?? [undefined, undefined];
	if (tsConfigPath == undefined || tsConfig == undefined) return undefined;
	const rootDir = path.parse(tsConfigPath).dir;
	const srcDir = tsConfig?.options.rootDir;
	if (srcDir == null) return undefined;
	const outDir = tsConfig?.options.outDir;
	if (outDir == null) return undefined;
	return {
		rootDir,
		srcDir: path.resolve(rootDir, srcDir),
		outDir: path.resolve(rootDir, outDir),
	};
}

export function getWorkspaceForActiveEditor(file: string) {
	return vscode.workspace.workspaceFolders?.find((wf) => isSubDirOrEqualDir(wf.uri.fsPath, file));
}

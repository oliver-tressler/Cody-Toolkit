import * as vscode from "vscode";
import * as ts from "typescript";
import * as path from "path";
import { BuildAndPublishFileConfigurationProxy } from "./Configuration/MementoProxy";
type BuildInfo = {};

function getTypescriptConfig(filePath: string) {
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
	return [tsConfigPath, compilerOptions] as const;
}

function getDirs(filePath: string) {
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

export function getBuildInfo(filePath: string, localStorage: vscode.Memento): BuildInfo | undefined {
	const dirs = getDirs(filePath);
	const config = new BuildAndPublishFileConfigurationProxy(localStorage);
	const fileConfig = config.getFileConfiguration(filePath);
	return {};
}

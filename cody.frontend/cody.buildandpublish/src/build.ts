import * as path from "path";
import * as vscode from "vscode";
import { Configuration } from "./Configuration/ConfigurationProxy";
import { BuildAndPublishFileConfigurationProxy } from "./Configuration/MementoProxy";
import { generateFiddlerRule } from "./generateFiddlerRules";
import { getDirs, isSubDirOrEqualDir } from "./Utils/fsUtils";

/**
 * Asks the user to provide a name for the output file.
 * @param filePath File for which to get the bundle name
 * @returns
 */
async function requestBundleName(filePath: string) {
	const fileName = path.parse(filePath).name;
	const bundleName = await vscode.window.showInputBox({
		ignoreFocusOut: true,
		prompt: "Please enter the name of the bundle (without extensions like '.bundle.min.js')",
		value: fileName,
		validateInput: (val) => {
			return new RegExp(/^[\w]+$/).test(val) ? null : "Please enter a valid file name without an extension";
		},
	});
	if (!bundleName) throw new Error("No filename provided");
	return bundleName;
}

/**
 * Asks the user to provide the output folder for the extension relative to the src dir specified in tsconfig.
 * @param filePath File for which to get the output dir.
 * @param srcFolder Src folder which will be used to construct the relative dir.
 * @returns Output folder relative to src dir
 */
async function requestBundleTargetFolder(filePath: string, srcFolder: string) {
	const bundleDirPath = await vscode.window.showInputBox({
		ignoreFocusOut: true,
		prompt: "Please enter the destination dir of the bundle relative to your out folder.",
		value: path.relative(srcFolder, path.parse(filePath).dir),
		validateInput: (val) => {
			if (!val) return null;
			if (path.isAbsolute(val)) return "Please enter a relative path";
			try {
				const parsedPath = path.parse(val);
				if (!!parsedPath.ext) return "Please enter a directory";
			} catch {
				return "Unable to parse path";
			}
			return null;
		},
	});
	if (!bundleDirPath) throw new Error("No target directory provided");
	return bundleDirPath;
}

/**
 * Runs webpack with ts-loader (transpile only), tsconfig-paths-plugin and default minifier.
 * Fails if errors are encountered.
 */
export function build(buildInfo: BuildInfo): Promise<BuildInfo> {
	const webpack = require("webpack");
	const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
	return new Promise((resolve, reject) => {
		webpack({
			mode: buildInfo.taskDefinition.publish ? "production" : "development",
			devtool: buildInfo.taskDefinition.publish ? "source-map" : "cheap-module-source-map",
			bail: buildInfo.taskDefinition.publish,
			entry: buildInfo.fileConfiguration.input.absoluteInputFile,
			context: buildInfo.directories.rootDir,
			module: {
				rules: [
					{
						test: [/\.ts$/],
						use: [
							{
								loader: "ts-loader",
								options: {
									transpileOnly: !buildInfo.taskDefinition.publish,
									onlyCompileBundledFiles: true,
								},
							},
						],
						exclude: "/node_modules/",
					},
				],
			},
			stats: {
				preset: "minimal",
			},
			resolve: {
				extensions: [".ts", ".js"],
				plugins: [
					new TsconfigPathsPlugin({
						configFile: path.join(buildInfo.directories.rootDir, "tsconfig.json"),
						extensions: [".ts"],
						context: buildInfo.directories.rootDir,
					}) as any, // TODO: Check if typings file is fixed eventually
				],
			},
			externals: {
				$: "jQuery",
				jquery: "jQuery",
			},
			optimization: {
				minimize: buildInfo.taskDefinition.publish,
			},
			output: {
				filename: buildInfo.fileConfiguration.output.outputFile,
				libraryTarget: "umd",
				path: path.dirname(buildInfo.fileConfiguration.output.absoluteOutputFile),
				pathinfo: true,
			},
		}).run((err: any, stats: any) => {
			if (err || stats?.hasErrors()) {
				const errors = [
					...(stats?.compilation.errors.map((statErr: any) => statErr.message) ?? []),
					err?.message,
				];
				errors.forEach(console.error); // TODO: Route to output channel
				reject(new Error("Some errors appeared during packing. Check the output log for details."));
			}
			if (Configuration.createFiddlerRulesWhenBuildingScripts) {
				generateFiddlerRule(buildInfo);
			}
			resolve(buildInfo);
		});
	});
}

export type BuildInfo = {
	directories: {
		rootDir: string;
		srcDir?: string;
		outDir?: string;
	};
	fileConfiguration: {
		output: {
			absoluteOutputFile: string;
			relativeOutputFile: string;
			outputFileName: string;
			outputFile: string;
		};
		input: {
			absoluteInputFile: string;
			relativeInputFile: string;
			inputFileName: string;
			inputFile: string;
		};
	};
	taskDefinition: {
		build: boolean;
		publish: boolean;
	};
};

/**
 * Collect info required to execute build. Store info in local storage so that user is not prompted every time.
 * @param filePath File to build
 * @param localStorage VS Code Workspace Memento
 * @param taskDefinition What to do with the file
 * @returns
 */
export async function getBuildInfo(
	filePath: string,
	localStorage: vscode.Memento,
	taskDefinition: { build: boolean; publish: boolean }
): Promise<BuildInfo> {
	const directories = getDirs(filePath);
	if (directories == null) throw new Error("Unable to parse tsconfig.json");
	if (directories.srcDir == null || !isSubDirOrEqualDir(directories.srcDir, filePath))
		throw new Error("Unable to build files outside of src dir. The source dir is taken from tsconfig.json.");
	const config = new BuildAndPublishFileConfigurationProxy(localStorage);
	const fileConfiguration = config.getFileConfiguration(filePath) ?? { inputFile: filePath };
	if (directories.outDir == null)
		throw new Error("Unable to read out dir. Check the outDir option in your tsconfig.json");
	if (fileConfiguration.outputFile == null) {
		const bundleName = await requestBundleName(filePath);
		const bundleDir = path.normalize(await requestBundleTargetFolder(filePath, directories.srcDir));
		fileConfiguration.inputFile = path.normalize(filePath);
		fileConfiguration.outputFile = path.join(bundleDir, bundleName + ".bundle.min.js");
		config.setFileConfiguration(filePath, fileConfiguration);
	}

	return {
		directories,
		taskDefinition,
		fileConfiguration: {
			output: {
				absoluteOutputFile: path.join(directories.outDir, fileConfiguration.outputFile),
				relativeOutputFile: fileConfiguration.outputFile,
				outputFileName: path.basename(fileConfiguration.outputFile, ".bundle.min.js"),
				outputFile: path.basename(fileConfiguration.outputFile),
			},
			input: {
				absoluteInputFile: fileConfiguration.inputFile!,
				relativeInputFile: path.relative(directories.srcDir, fileConfiguration.inputFile!),
				inputFileName: path.parse(fileConfiguration.inputFile!).name,
				inputFile: path.basename(fileConfiguration.inputFile!),
			},
		},
	};
}

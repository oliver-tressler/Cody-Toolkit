import * as path from "path";
import { default as TsconfigPathsPlugin } from "tsconfig-paths-webpack-plugin";
import * as vscode from "vscode";
import * as webpack from "webpack";
import { Configuration } from "./Configuration/ConfigurationProxy";
import { BuildAndPublishFileConfigurationProxy } from "./Configuration/MementoProxy";
import { generateFiddlerRule } from "./generateFiddlerRules";
import { getDirs } from "./Utils/fsUtils";



async function requestBundleName(filePath: string) {
	const fileName = path.parse(filePath).name;
	const bundleName = await vscode.window.showInputBox({
		ignoreFocusOut: true,
		prompt: "Please enter the name of the bundle (without '.bundle.js')",
		value: fileName,
		validateInput: (val) => {
			return new RegExp(/^[\w]+$/).test(val) ? null : "Please enter a valid file name without an extension";
		},
	});
	if (!bundleName) throw new Error("No filename provided");
	return bundleName;
}

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

export function build(buildInfo: BuildInfo): Promise<BuildInfo> {
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
						use: [{ loader: "ts-loader", options: { transpileOnly: true, onlyCompileBundledFiles: true } }],
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
				path: path.join(
					buildInfo.directories.outDir,
					path.dirname(buildInfo.fileConfiguration.output.relativeOutputFile ?? "")
				),
				pathinfo: true,
			},
		}).run((err, stats) => {
			if (err || stats?.hasErrors()) {
				const errors = [...(stats?.compilation.errors.map((statErr) => statErr.message) ?? []), err?.message];
				errors.forEach(console.error); // TODO: Route to output channel
				reject("Some errors appeared during packing. Check the output log for details.");
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
		srcDir: string;
		outDir: string;
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
export async function getBuildInfo(
	filePath: string,
	localStorage: vscode.Memento,
	taskDefinition: { build: boolean; publish: boolean }
): Promise<BuildInfo> {
	const directories = getDirs(filePath);
	if (directories == null) throw new Error("Unable to parse tsconfig.json");
	const config = new BuildAndPublishFileConfigurationProxy(localStorage);
	const fileConfiguration = config.getFileConfiguration(filePath) ?? { inputFile: filePath };
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

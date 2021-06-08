import { relative, parse, normalize } from "path";
import * as vscode from "vscode";
import { publishWebResource } from "./Api/Api";
import { BuildAndPublishFileConfigurationProxy } from "./Configuration/MementoProxy";
import { getConnectionState } from "./Utils/connection";
import { getDirs, isSubDirOrEqualDir } from "./Utils/fsUtils";

/**
 * Asks the user for the full name of the web resource.
 */
async function requestOutputFileName(filePath: string) {
	const workspace = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
	const dirs = getDirs(filePath) ?? {
		rootDir: workspace?.uri.fsPath,
		outDir: undefined,
		srcDir: undefined,
	};
	let suggestedFileName = filePath;
	if (dirs?.srcDir != null && isSubDirOrEqualDir(dirs.srcDir, filePath)) {
		suggestedFileName = relative(dirs.srcDir, filePath);
	} else if (dirs?.outDir != null && isSubDirOrEqualDir(dirs.outDir, filePath)) {
		suggestedFileName = relative(dirs.outDir, filePath);
	} else if (dirs?.rootDir != null && isSubDirOrEqualDir(dirs.rootDir, filePath)) {
		suggestedFileName = relative(dirs.rootDir, filePath);
	} else {
		// WTF are you trying to do here?
	}
	const outputFileName = await vscode.window.showInputBox({
		ignoreFocusOut: true,
		value: suggestedFileName,
		prompt: "Please enter the name of the resource",
	});
	if (outputFileName == null) throw new Error("No resource name provided");
	return outputFileName;
}

/**
 * Collects info thats required to create a webresource in the CRM.
 */
export async function getPublishInfo(filePath: string, localStorage: vscode.Memento): Promise<PublishFileInfo> {
	const config = new BuildAndPublishFileConfigurationProxy(localStorage);
	let fileConfig = config.getFileConfiguration(filePath);
	if (fileConfig?.outputFile == null) {
		fileConfig = {
			inputFile: filePath,
			outputFile: await requestOutputFileName(filePath),
		};
		config.setFileConfiguration(filePath, fileConfig);
	}

	return {
		fileConfiguration: {
			output: {
				absoluteOutputFile: normalize(filePath),
				outputFileName: parse(fileConfig.outputFile!).name,
				relativeOutputFile: normalize(fileConfig.outputFile!),
			},
		},
	};
}

type PublishFileInfo = {
	fileConfiguration: {
		output: {
			absoluteOutputFile: string;
			relativeOutputFile: string;
			outputFileName: string;
		};
	};
};

/**
 * Publishes a WebResource file to the CRM. Throws error if Cody Core is not authenticated.
 * Display name will be the bundle name, Name will be the path of the output file relative to the output dir.
 * If the WebResource already exists, the display name will not be updated. The check for existing webresources
 * is done by checking if a resource with an equal name exists.
 */
export async function publish(info: PublishFileInfo) {
	const connection = await getConnectionState();
	if (connection?.activeOrganization == null) throw new Error("Unauthorized");
	await publishWebResource(connection.activeOrganization.UniqueName, {
		Path: info.fileConfiguration.output.absoluteOutputFile,
		DisplayName: info.fileConfiguration.output.outputFileName.replace(/\\|(\/+)/g, "/"),
		Name: info.fileConfiguration.output.relativeOutputFile.replace(/\\|(\/+)/g, "/"),
	});
}

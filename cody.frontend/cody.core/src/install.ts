import * as vscode from "vscode";
import { Configuration } from "./Configuration/ConfigurationProxy";
import { FileInfo } from "./Utils/FileInfo";

/**
 * Run if configuration is not complete
 * @param context
 */
export async function install(context: vscode.ExtensionContext, then: (context: vscode.ExtensionContext) => void) {
	// Ask the user if he wants do install cody
	const shouldInstall =
		(await vscode.window.showInformationMessage(
			"Cody Toolkit requires that you specify the path to the backend server.",
			"Configure"
		)) === "Configure";
	if (!shouldInstall) return;
	Configuration.backendServerPort = Configuration.backendServerPort ?? 8080;

	// Get the exe file for the backend server
	const backendServerLocation = await vscode.window.showOpenDialog({
		canSelectFiles: true,
		canSelectFolders: false,
		canSelectMany: false,
		openLabel: "Choose",
		filters: { Executable: ["exe", "EXE"] },
		title: "Select Cody Toolkit Backend Executable",
	});
	if (backendServerLocation == null || backendServerLocation.length == 0) return;
	Configuration.backendServerLocation = new FileInfo(
		backendServerLocation[0].fsPath,
		Configuration.projectRootPath
	).asForwardSlash().file;
	// Ask for the port
	const portOkResponse = await vscode.window.showInformationMessage(
		"The port that will be used is " + Configuration.backendServerPort + ". Is that okay with you?",
		"Yes, Let's Go",
		"Configure"
	);
	// Close icon clicked
	if (portOkResponse == null) return;
	// Port specified in config is fine
	if (portOkResponse == "Yes, Let's Go") {
		then(context);
	}
	// Configure port
	const port = await vscode.window.showInputBox({
		value: Configuration.backendServerPort.toString(),
		ignoreFocusOut: true,
		prompt: "Please enter the port that should be used to communicate with the Cody Toolkit Backend",
	});
	if (port == null) return;
	if (isNaN(parseInt(port))) {
		vscode.window.showErrorMessage("Not a valid port");
		return;
	}
	Configuration.backendServerPort = parseInt(port);
	then(context);
}

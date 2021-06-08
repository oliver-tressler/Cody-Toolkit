import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { Configuration } from "./Configuration/ConfigurationProxy";
export const defaultBackendServerLocation = path.join(
	os.homedir(),
	"AppData",
	"Local",
	"CodyToolkitBackend",
	"bin",
	"cody.backend.api.exe"
);

function validPort(val?: number) {
	return val != null && typeof val == "number" && !isNaN(val) && val > 1023 && val < 65536;
}

function validBackendServerLocation(val?: string) {
	return val != null && typeof val == "string" && val.toLowerCase().endsWith(".exe") && fs.existsSync(val);
}

async function setupBackendServerExecutable() {
	// Get the exe file for the backend server
	const backendServerLocation = await vscode.window.showOpenDialog({
		canSelectFiles: true,
		canSelectFolders: false,
		canSelectMany: false,
		openLabel: "Choose",
		filters: { Executable: ["exe", "EXE"] },
		title: "Select Cody Toolkit Backend Executable",
		defaultUri: vscode.Uri.file(path.join(os.homedir(), "AppData", "Local")),
	});
	if (
		backendServerLocation == null ||
		backendServerLocation.length == 0 ||
		!validBackendServerLocation(backendServerLocation[0].fsPath)
	) {
		throw new Error("No valid backend server executable specified.");
	}
	Configuration.backendServerLocation = backendServerLocation[0].fsPath;
}

async function setupBackendServerPort() {
	const noPortError = new Error(
		"Cody Toolkit will not be able to run properly until you specify a valid port for the backend. Set a port manually via VS Code Settings or reload your window."
	);
	// Set default if not present
	Configuration.backendServerPort = 8080;
	// Ask for the port
	const portOkResponse = await vscode.window.showInformationMessage(
		"The port that will be used is " + (Configuration.backendServerPort || 8080) + ". Is that okay with you?",
		"Yes, Let's Go",
		"Configure"
	);
	// Close icon clicked
	if (portOkResponse == null) throw noPortError;
	// Port specified in config is fine
	if (portOkResponse == "Yes, Let's Go") {
		return;
	}
	// Configure port
	const port = await vscode.window.showInputBox({
		value: (Configuration.backendServerPort || 8080).toString(),
		ignoreFocusOut: true,
		prompt: "Please enter the port that should be used to communicate with the Cody Toolkit Backend",
		validateInput: (p) => {
			const parsed = p ? parseInt(p) : undefined;
			return validPort(parsed) ? null : "Not a valid port";
		},
	});
	if (port == null) throw noPortError;
	Configuration.backendServerPort = parseInt(port);
}

/**
 * Run if configuration is not complete
 * @param context
 */
export async function setup(context: vscode.ExtensionContext) {
	// Ask the user if he wants to install cody
	const shouldInstall = async () =>
		(await vscode.window.showInformationMessage(
			"Cody Toolkit requires some configuration before it can run.",
			"Configure"
		)) === "Configure";

	const locationOk = () =>
		validBackendServerLocation(Configuration.backendServerLocation || defaultBackendServerLocation);
	const portOk = () => validPort(Configuration.backendServerPort);
	if (locationOk() && portOk()) {
		return context;
	} else if (await shouldInstall()) {
		!locationOk() && (await setupBackendServerExecutable());
		!portOk() && (await setupBackendServerPort());
		// Wait for the configuration values to be set. Only happens during initial configuration.
		await new Promise((resolve) => setTimeout(resolve, 250));
		if (!locationOk() || !portOk()) {
			// Just to be safe
			throw new Error("Configuration Incomplete");
		}
		return context;
	} else {
		throw new Error("Configuration Incomplete");
	}
}

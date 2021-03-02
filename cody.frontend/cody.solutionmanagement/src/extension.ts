// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

type BaseInstanceConfiguration = {
	instanceId: string;
	useCredentialsFile: boolean;
};

type ManualInstanceConfiguration = BaseInstanceConfiguration & {
	discoveryServiceUrl: string;
	userName: string;
	useCredentialsFile: false;
};

type CredentialsFileInstanceConfiguration = BaseInstanceConfiguration & {
	credentialsFilePath: string;
	useCredentialsFile: true;
};

type InstanceConfiguration = ManualInstanceConfiguration | CredentialsFileInstanceConfiguration;

type OrganizationConfiguration = {
	UniqueName: string;
	FriendlyName: string;
	UrlName: string;
	Url: string;
};

type ConnectionState = {
	activeInstance?: InstanceConfiguration & { authenticated: boolean };
	activeOrganization?: OrganizationConfiguration;
	availableOrganizations: OrganizationConfiguration[];

	connecting: boolean;
};

async function createSolution() {
	const connectionState = await vscode.commands.executeCommand<ConnectionState>(
		"cody.toolkit.core.getConnectionState"
	);
	if (connectionState?.activeInstance?.authenticated !== true || connectionState?.activeOrganization == null) {
		vscode.window.showErrorMessage("Not Authenticated");
		return;
	}
	vscode.window.withProgress(
		{ location: vscode.ProgressLocation.Notification, title: "Add to Solution", cancellable: false },
		async (progress: vscode.Progress<{ message: string }>) => {}
	);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate({ subscriptions }: vscode.ExtensionContext) {
	const addAssemblyToSolutionCommand = vscode.commands.registerCommand(
		"cody.toolkit.solutionmanager.addassemblytosolution",
		async () => {}
	);
	const addWebResourceToSolutionCommand = vscode.commands.registerCommand(
		"cody.toolkit.solutionmanager.addwebresourcetosolution",
		async () => {}
	);
	const createSolutionCommand = vscode.commands.registerCommand(
		"cody.toolkit.solutionmanager.createsolution",
		createSolution
	);
	subscriptions.push(addAssemblyToSolutionCommand, addWebResourceToSolutionCommand, createSolutionCommand);
}

// this method is called when your extension is deactivated
export function deactivate() {}

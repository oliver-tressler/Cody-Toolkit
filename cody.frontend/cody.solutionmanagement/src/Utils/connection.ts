import * as vscode from "vscode";

type ConnectionState = {
	activeInstance?: { authenticated: boolean };
	activeOrganization?: undefined | { UniqueName: string };
};

export async function getActiveOrganization() {
	const connectionState = await vscode.commands.executeCommand<ConnectionState>(
		"cody.toolkit.core.getConnectionState"
	);
	if (connectionState?.activeInstance?.authenticated !== true || connectionState?.activeOrganization == null) {
		return undefined;
	}
	return connectionState.activeOrganization;
}

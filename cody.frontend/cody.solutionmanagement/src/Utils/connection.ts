import * as vscode from "vscode";

export type ConnectionState = {
	activeInstance?: { authenticated: boolean; instanceId: string };
	activeOrganization?: undefined | { UniqueName: string };
};

export function getConnectionState() {
	return vscode.commands.executeCommand<ConnectionState>("cody.toolkit.core.getConnectionState");
}

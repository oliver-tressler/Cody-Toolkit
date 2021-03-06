import * as vscode from "vscode";

export type ConnectionState = {
	activeInstance?: { authenticated: boolean; instanceId: string };
	activeOrganization?: undefined | { UniqueName: string };
};

/**
 * Get the connection state from cody core to determine the active instance and organization
 */
export function getConnectionState() {
	return vscode.commands.executeCommand<ConnectionState>("cody.toolkit.core.getConnectionState");
}

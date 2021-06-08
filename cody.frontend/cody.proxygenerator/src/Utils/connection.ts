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

/**
 * Make sure that the user is logged in to an organization.
 */
export async function assertConnection() {
	const state = await getConnectionState();
	if (state?.activeOrganization?.UniqueName == null) {
		throw new Error("Unauthorized");
	}
	return state as AuthorizedConnectionState;
}

export type AuthorizedConnectionState = ConnectionState & {
	activeOrganization: { UniqueName: string };
};

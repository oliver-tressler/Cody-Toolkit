import * as vscode from "vscode";

type ConnectionState = {
	activeInstance?: { authenticated: boolean; instanceId: string };
	activeOrganization?: { UniqueName: string };
};

export type AuthorizedConnectionState = {
	activeInstance: { authenticated: true; instanceId: string };
	activeOrganization: { UniqueName: string };
};

/**
 * Get the connection state from cody core to determine the active instance and organization
 */
export function getConnectionState() {
	return vscode.commands.executeCommand<ConnectionState>("cody.toolkit.core.getConnectionState");
}

export async function withAuthentication<T>(delegate: (connectionState: AuthorizedConnectionState) => T) {
	const connectionState = await getConnectionState();
	if (
		connectionState == null ||
		connectionState.activeInstance == null ||
		connectionState.activeInstance.authenticated !== true ||
		connectionState.activeOrganization == null
	) {
		throw new Error("Unauthorized");
	} else {
		return delegate(connectionState as AuthorizedConnectionState);
	}
}

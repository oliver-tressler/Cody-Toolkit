import * as api from "./Api/connectionApi";
import { OrganizationConfiguration } from "./Api/connectionApi";
import { InstanceConfigurationProxy } from "./Configuration/MementoProxy";
import { ConnectionState } from "./Utils/ServerConnector";
import { requestPassword } from "./Utils/userInteraction";

/**
 * Connect to one of the available organizations for the current instance.
 * @param port
 * @param connectionState
 * @param chosenOrganization
 * @param password Required if the instance is not using a credentials file
 */

export async function connectToOrganization(
	port: number,
	connectionState: ConnectionState,
	config: InstanceConfigurationProxy,
	chosenOrganization?: OrganizationConfiguration,
	password?: string
) {
	if (connectionState.activeInstance == null)
		throw new Error("Unable to change organization without active instance");
	if (chosenOrganization == null) return { password, connectionState };
	const connectionAliveResponse = await api.connectionAlive(port, chosenOrganization.UniqueName);
	if (connectionAliveResponse) {
		return;
	}
	const { Success: connectionSuccessfullyEstablished, Expires } = await api.establishConnection(
		port,
		connectionState.activeInstance,
		chosenOrganization,
		connectionState.activeInstance.useCredentialsFile
			? config.getCredentialsFileKey(connectionState.activeInstance.instanceId)
			: await (async () => {
					if (password != null) return password;
					if (connectionState.activeInstance == null) throw new Error("Chose org without active instance");
					password = await requestPassword(connectionState.activeInstance.instanceId);
					return password;
			  })()
	);
	if (connectionSuccessfullyEstablished === true) {
		connectionState.activeOrganization = chosenOrganization;
	} else throw new Error("Connection not established");
	return { password, connectionState };
}

export async function switchToOrganization(
	port: number,
	connectionState: ConnectionState,
	config: InstanceConfigurationProxy,
	chosenOrganization?: OrganizationConfiguration,
	password?: string
) {
	if (chosenOrganization != null) await connectToOrganization(port, connectionState, config, chosenOrganization);
	connectionState.activeOrganization = chosenOrganization;
	return { password, connectionState };
}

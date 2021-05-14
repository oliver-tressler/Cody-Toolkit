import * as fs from "fs";
import {
	CredentialsFileInstanceConfiguration,
	InstanceConfiguration,
	InstanceConfigurationProxy,
} from "./Configuration/MementoProxy";
import { ConnectionState } from "./Utils/ServerConnector";
import { chooseInstance } from "./Utils/userInteraction";

async function deleteCredentialsFile(
	config: InstanceConfigurationProxy,
	instance: CredentialsFileInstanceConfiguration
) {
	try {
		fs.unlinkSync(instance.credentialsFilePath);
		config.removeCredentialsFileKey(instance.instanceId);
	} catch {
		console.warn(`Credentials file for instance ${instance.instanceId} not found.`);
	}
}

/**
 * Delete an instance configuration. If it is the currently active instance, disconnect.
 * @param connectionState
 * @param config Memento Proxy
 * @param instance The instance to delete
 */
export async function removeInstance(
	connectionState: ConnectionState,
	config: InstanceConfigurationProxy,
	instance: InstanceConfiguration
) {
	if (instance == null || config.instances == null || config.instances.length == 0) return { connectionState };
	const chosenInstanceWasActiveInstance = instance.instanceId == connectionState.activeInstance?.instanceId;
	config.removeInstance(instance.instanceId);
	if (chosenInstanceWasActiveInstance) {
		connectionState.activeInstance = undefined;
		connectionState.activeOrganization = undefined;
		connectionState.availableOrganizations = [];
		config.activeInstance = undefined;
	}
	if (instance.useCredentialsFile) {
		await deleteCredentialsFile(config, instance);
	}
	return { connectionState };
}

export async function removeInstanceCommand(
	connectionState: ConnectionState,
	config: InstanceConfigurationProxy,
	refreshButtonText: (connectionState: ConnectionState) => void
) {
	const chosenInstance = await chooseInstance(config.instances, connectionState);
	if (chosenInstance == null) return;
	({ connectionState: connectionState } = await removeInstance(connectionState, config, chosenInstance.instance));
	refreshButtonText(connectionState);
}

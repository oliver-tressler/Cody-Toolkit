import * as fs from "fs";
import {
    CredentialsFileInstanceConfiguration,
    InstanceConfiguration,
    InstanceConfigurationProxy,
} from "./Configuration/MementoProxy";
import { ConnectionManager } from "./connectionState";
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
    connectionManager: ConnectionManager,
    config: InstanceConfigurationProxy,
    instance: InstanceConfiguration
) {
    if (instance == null || config.instances == null || config.instances.length == 0) {
        return { connectionState: connectionManager.connectionState };
    }
    config.removeInstance(instance.instanceId);
    const chosenInstanceWasActiveInstance =
        instance.instanceId == connectionManager.connectionState.activeInstance?.instanceId;
    if (chosenInstanceWasActiveInstance) {
        connectionManager.changeActiveInstance(undefined);
    }
    if (instance.useCredentialsFile) {
        await deleteCredentialsFile(config, instance);
    }
    return { connectionState: connectionManager.connectionState };
}

export async function removeInstanceCommand(connectionManager: ConnectionManager, config: InstanceConfigurationProxy) {
    const connectionState = connectionManager.connectionState;
    const chosenInstance = await chooseInstance(config.instances, connectionState);
    if (chosenInstance == null) return;
    await removeInstance(connectionManager, config, chosenInstance.instance);
}

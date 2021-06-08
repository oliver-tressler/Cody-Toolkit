import { switchToOrganization } from "./changeOrganization";
import { InstanceConfiguration, InstanceConfigurationProxy } from "./Configuration/MementoProxy";
import { ConnectionManager } from "./connectionState";
import { getPasswordOrKeyFromInstance } from "./getPasswordOrKeyFromInstance";
import { showQuickPickForInstanceSwitching } from "./Utils/userInteraction";

/**
 * Change the currently active instance and optionally select an organization
 * @param connector
 * @param connectionState
 * @param config
 * @param chosenInstance
 * @param passwordOrKey Password is required if the instance does not use a credentials file
 */
export async function switchToInstance(
    connectionManager: ConnectionManager,
    config: InstanceConfigurationProxy,
    chosenInstance: InstanceConfiguration,
    passwordOrKey?: string) {
    passwordOrKey = passwordOrKey ?? (await getPasswordOrKeyFromInstance(config, chosenInstance));
    await connectionManager.changeActiveInstance(chosenInstance, passwordOrKey);
    const chosenOrg = await showQuickPickForInstanceSwitching({
        connectionState: connectionManager.connectionState,
        organizations: connectionManager.connectionState.availableOrganizations,
    });
    if (chosenOrg == null || chosenOrg.type !== "organization")
        return passwordOrKey;
    return await switchToOrganization(connectionManager, config, chosenOrg.organization, passwordOrKey);
}

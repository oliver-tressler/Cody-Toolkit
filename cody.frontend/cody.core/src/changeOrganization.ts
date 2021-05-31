import { InstanceConfigurationProxy } from "./Configuration/MementoProxy";
import { ConnectionManager, OrganizationConfiguration } from "./connectionState";
import { getPasswordOrKeyFromInstance } from "./getPasswordOrKeyFromInstance";

/**
 * Connect to one of the available organizations for the current instance.
 * @param port
 * @param connectionState
 * @param chosenOrganization
 * @param passwordOrKey Required if the instance is not using a credentials file
 */

export async function connectToOrganization(
    connectionManager: ConnectionManager,
    config: InstanceConfigurationProxy,
    chosenOrganization: OrganizationConfiguration | undefined,
    passwordOrKey?: string
) {
    if (connectionManager.connectionState.activeInstance == null) {
        throw new Error("Can't connect to an organization if there is no connected instance.");
    }
    passwordOrKey = passwordOrKey ?? await getPasswordOrKeyFromInstance(config, connectionManager.connectionState.activeInstance);

    const connectionState = connectionManager.connectionState;
    if (chosenOrganization == null) return { password: passwordOrKey, connectionState };
    try {
        await connectionManager.authenticateOrganization(chosenOrganization, passwordOrKey);
    } catch (e) {
        throw new Error("Unable to establish connection to organization " + chosenOrganization.UniqueName);
    }
    return passwordOrKey;
}

export async function switchToOrganization(
    connectionManager: ConnectionManager,
    config: InstanceConfigurationProxy,
    chosenOrganization: OrganizationConfiguration | undefined,
    passwordOrKey?: string
) {
    if (connectionManager.connectionState.activeInstance == null) {
        throw new Error("Can't connect to an organization if there is no connected instance.");
    }
    passwordOrKey = passwordOrKey ?? await getPasswordOrKeyFromInstance(config, connectionManager.connectionState.activeInstance);
    try {
        connectionManager.changeActiveOrganization(chosenOrganization, passwordOrKey);
    } catch (e) {
        if (chosenOrganization != null)
            throw new Error("Unable to establish connection to organization " + chosenOrganization.UniqueName);
        throw new Error("Unable to disconnect organization");
    }
    return passwordOrKey;
}
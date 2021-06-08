import { InstanceConfigurationProxy } from "./Configuration/MementoProxy";
import { ConnectionManager } from "./connectionState";
import { getPasswordOrKeyFromInstance } from "./getPasswordOrKeyFromInstance";
import { registerInstance } from "./registerNewInstance";
import { showQuickPickForInstanceSwitching } from "./Utils/userInteraction";

/**
 * Create a new instance, then make it the currently active instance to it and optionally connecto to one of its
 * organizations.
 * @param port
 * @param connectionState
 * @param config
 * @param withCredentialsFile If true, the new configuration will use a credential file.
 * @param passwordOrKey Password is required if the instance does not use a credentials file.
 */
export async function switchToNewInstance(
    connectionManager: ConnectionManager,
    config: InstanceConfigurationProxy,
    withCredentialsFile?: boolean,
    passwordOrKey?: string) {
    const { instance, password: pw } = await registerInstance(config, withCredentialsFile);
    if (pw != null)
        passwordOrKey = pw;
    if (instance == null)
        return passwordOrKey; // Nothing was created
    passwordOrKey = passwordOrKey ?? (await getPasswordOrKeyFromInstance(config, instance));
    // A newly registered non null instance is already authenticated
    await connectionManager.changeActiveInstance(instance, passwordOrKey);
    const chosenOrg = await showQuickPickForInstanceSwitching({
        connectionState: connectionManager.connectionState,
        organizations: connectionManager.connectionState.availableOrganizations,
    });
    if (chosenOrg == null || chosenOrg.type !== "organization" /* Type Guard */)
        return passwordOrKey;
    connectionManager.changeActiveOrganization(chosenOrg.organization, passwordOrKey);
    return passwordOrKey;
}

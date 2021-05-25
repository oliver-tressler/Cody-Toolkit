import * as vscode from "vscode";
import { connectToOrganization, switchToOrganization } from "./changeOrganization";
import { InstanceConfiguration, InstanceConfigurationProxy } from "./Configuration/MementoProxy";
import { ConnectionManager, OrganizationConfiguration, TaskbarConnectionStateViewer } from "./connectionState";
import { getPasswordOrKeyFromInstance } from "./getPasswordOrKeyFromInstance";
import { registerInstance } from "./registerNewInstance";
import { removeInstanceCommand as removeInstance } from "./removeInstance";
import { setup } from "./setup";
import { errorHandler } from "./Utils/errorHandling";
import { ServerConnector } from "./Utils/ServerConnector";
import { showQuickPickForInstanceSwitching } from "./Utils/userInteraction";

/**
 * Change the currently active instance and optionally select an organization
 * @param connector
 * @param connectionState
 * @param config
 * @param chosenInstance
 * @param passwordOrKey Password is required if the instance does not use a credentials file
 */
async function switchToInstance(
    connectionManager: ConnectionManager,
    config: InstanceConfigurationProxy,
    chosenInstance: InstanceConfiguration,
    passwordOrKey?: string
) {
    passwordOrKey = passwordOrKey ?? (await getPasswordOrKeyFromInstance(config, chosenInstance));
    await connectionManager.changeActiveInstance(chosenInstance, passwordOrKey);
    const chosenOrg = await showQuickPickForInstanceSwitching({
        connectionState: connectionManager.connectionState,
        organizations: connectionManager.connectionState.availableOrganizations,
    });
    if (chosenOrg == null || chosenOrg.type !== "organization") return passwordOrKey;
    return await switchToOrganization(connectionManager, config, chosenOrg.organization, passwordOrKey);
}

/**
 * Create a new instance, then make it the currently active instance to it and optionally connecto to one of its
 * organizations.
 * @param port
 * @param connectionState
 * @param config
 * @param withCredentialsFile If true, the new configuration will use a credential file.
 * @param passwordOrKey Password is required if the instance does not use a credentials file.
 */
async function switchToNewInstance(
    connectionManager: ConnectionManager,
    config: InstanceConfigurationProxy,
    withCredentialsFile?: boolean,
    passwordOrKey?: string
) {
    const { instance, password: pw } = await registerInstance(config, withCredentialsFile);
    if (pw != null) passwordOrKey = pw;
    if (instance == null) return passwordOrKey; // Nothing was created
    passwordOrKey = passwordOrKey ?? (await getPasswordOrKeyFromInstance(config, instance));
    // A newly registered non null instance is already authenticated
    await connectionManager.changeActiveInstance(instance, passwordOrKey);
    const chosenOrg = await showQuickPickForInstanceSwitching({
        connectionState: connectionManager.connectionState,
        organizations: connectionManager.connectionState.availableOrganizations,
    });
    if (chosenOrg == null || chosenOrg.type !== "organization" /* Type Guard */) return passwordOrKey;
    connectionManager.changeActiveOrganization(chosenOrg.organization, passwordOrKey);
    return passwordOrKey;
}

const registerSwitchInstanceCommand = (connectionManager: ConnectionManager, config: InstanceConfigurationProxy) => {
    return vscode.commands.registerCommand("cody.toolkit.core.connect.switchInstance", async () => {
        try {
            // If a preselected instance exists it isn't authenticated.
            // Offer connecting to it. If aborted clear initial connection state and offer regular
            // connection options.
            if (connectionManager.connectionState.activeInstance?.authenticated === false) {
                try {
                    await switchToInstance(connectionManager, config, connectionManager.connectionState.activeInstance);
                    return;
                } catch {
                    connectionManager.changeActiveInstance(undefined);
                }
            }
            const chosen = await showQuickPickForInstanceSwitching({
                connectionState: connectionManager.connectionState,
                organizations: connectionManager.connectionState.availableOrganizations,
                instances: config.instances,
                includeCreateNewOptions: true,
            });
            if (chosen == null) {
                return; // Nothing was chosen
            }
            // A new instance should be created.
            if (chosen?.type == "newInstance") {
                await switchToNewInstance(connectionManager, config, chosen.useCredentialsFile);
            }
            // Switch to another instance.
            else if (
                chosen?.type == "instance" &&
                chosen.instance.instanceId !== connectionManager.connectionState.activeInstance?.instanceId
            ) {
                await switchToInstance(connectionManager, config, chosen.instance);
            }
            // Switch to another organization within the same instance.
            else if (
                chosen?.type == "organization" &&
                chosen.organization.UniqueName !== connectionManager.connectionState.activeOrganization?.UniqueName
            ) {
                await switchToOrganization(connectionManager, config, chosen.organization);
            } else {
                return;
            }
            // If this line is reached, an authenticated organization service exists for the current configuration.
            // This will be the trigger to load modules that use this connection.
            vscode.commands.executeCommand("cody.toolkit.core.activateModules");
        } catch (e) {
            if (e instanceof Error) {
                vscode.window.showErrorMessage(e.message);
                return;
            }
            throw e;
        } finally {
        }
    });
};

export async function launch({ subscriptions, workspaceState, globalState }: vscode.ExtensionContext) {
    await new ServerConnector().launchServer().then(() => {
        const config = new InstanceConfigurationProxy(workspaceState, globalState);
        // Preselect instance used the last time
        const connectionManager = new ConnectionManager(config);
        const connectionStateViewer = new TaskbarConnectionStateViewer("cody_tb_conn_viewer");
        connectionManager.registerObserver(connectionStateViewer);

        const removeInstanceCommand = vscode.commands.registerCommand(
            "cody.toolkit.core.connect.removeInstance",
            async () => removeInstance(connectionManager, config)
        );
        const connectToOrganizationCommand = vscode.commands.registerCommand(
            "cody.toolkit.core.connect.connectToOrganization",
            async (organization?: OrganizationConfiguration) =>
                connectToOrganization(connectionManager, config, organization)
        );
        const switchInstanceCommand = registerSwitchInstanceCommand(connectionManager, config);
        // Empty command. Just an activation trigger for other modules.
        const activateModulesCommand = vscode.commands.registerCommand("cody.toolkit.core.activateModules", () => {});
        // Make connection state available to other modules.
        const getConnectionStateCommand = vscode.commands.registerCommand(
            "cody.toolkit.core.getConnectionState",
            () => connectionManager.connectionState
        );
        subscriptions.push(
            connectionManager,
            connectToOrganizationCommand,
            switchInstanceCommand,
            removeInstanceCommand,
            activateModulesCommand,
            getConnectionStateCommand
        );
    });
}

export function activate(context: vscode.ExtensionContext) {
    setup(context).then(launch).catch(errorHandler);
}

export function deactivate() {}

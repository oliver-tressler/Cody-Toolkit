import * as vscode from "vscode";
import { connectToOrganization, switchToOrganization } from "./changeOrganization";
import { InstanceConfigurationProxy } from "./Configuration/MementoProxy";
import { ConnectionManager, OrganizationConfiguration, TaskbarConnectionStateViewer } from "./connectionState";
import { getPasswordOrKeyFromInstance } from "./getPasswordOrKeyFromInstance";
import { removeInstanceCommand as removeInstance } from "./removeInstance";
import { setup } from "./setup";
import { switchToInstance } from "./switchToInstance";
import { switchToNewInstance } from "./switchToNewInstance";
import { errorHandler } from "./Utils/errorHandling";
import { ServerConnector } from "./Utils/ServerConnector";
import { showQuickPickForInstanceSwitching } from "./Utils/userInteraction";

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
        }
    });
};

const registerConnectToOrganizationCommand = (
    connectionManager: ConnectionManager,
    config: InstanceConfigurationProxy
) => {
    return vscode.commands.registerCommand(
        "cody.toolkit.core.connect.connectToOrganization",
        async (organizationUniqueName?: string) => {
            try {
                if (
                    connectionManager.connectionState.activeInstance?.authenticated !== true ||
                    connectionManager.connectionState.availableOrganizations.length == 0
                ) {
                    return { success: false };
                }

                let organizationToAuthenticate: OrganizationConfiguration;
                if (organizationUniqueName == null) {
                    const chosenOrganization = await showQuickPickForInstanceSwitching({
                        connectionState: connectionManager.connectionState,
                        organizations: connectionManager.connectionState.availableOrganizations.filter(
                            (org) => org.UniqueName !== connectionManager.connectionState.activeOrganization?.UniqueName
                        ),
                    });
                    if (chosenOrganization == null || chosenOrganization.type !== "organization") {
                        return { success: false };
                    }
                    organizationToAuthenticate = chosenOrganization.organization;
                } else {
                    const organization = connectionManager.connectionState.availableOrganizations.find(
                        (organization) => organization.UniqueName == organizationUniqueName
                    );
                    if (organization == null) return { success: false };
                    organizationToAuthenticate = organization;
                }
                await connectToOrganization(connectionManager, config, organizationToAuthenticate);
                return { success: true };
            } catch {
                return { success: false };
            }
        }
    );
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
        const switchInstanceCommand = registerSwitchInstanceCommand(connectionManager, config);
        const connectToOrganizationCommand = registerConnectToOrganizationCommand(connectionManager, config);
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

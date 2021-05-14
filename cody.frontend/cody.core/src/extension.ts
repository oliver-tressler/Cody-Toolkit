import * as vscode from "vscode";
import * as api from "./Api/connectionApi";
import { OrganizationConfiguration } from "./Api/connectionApi";
import { connectToOrganization, switchToOrganization } from "./changeOrganization";
import { InstanceConfiguration, InstanceConfigurationProxy } from "./Configuration/MementoProxy";
import { registerInstance } from "./registerNewInstance";
import { removeInstanceCommand as removeInstance } from "./removeInstance";
import { setup } from "./setup";
import { errorHandler } from "./Utils/errorHandling";
import { ConnectionState, ServerConnector } from "./Utils/ServerConnector";
import { createStatusBarItem, requestPassword, showQuickPickForInstanceSwitching } from "./Utils/userInteraction";

/**
 * Change the currently active instance and optionally select an organization
 * @param connector
 * @param connectionState
 * @param config
 * @param chosenInstance
 * @param password Password is required if the instance does not use a credentials file
 */
async function switchToInstance(
	port: number,
	connectionState: ConnectionState,
	config: InstanceConfigurationProxy,
	chosenInstance: InstanceConfiguration,
	password?: string
) {
	if (!chosenInstance.useCredentialsFile && password == null) {
		password = await requestPassword(chosenInstance.instanceId);
	}
	const isValidConfigurationResult = await api.isValidDiscoveryServiceConfiguration(
		port,
		chosenInstance,
		chosenInstance.useCredentialsFile
			? config.getCredentialsFileKey(chosenInstance.instanceId)
			: await (async () => {
					if (password != null) return password;
					password = await requestPassword(chosenInstance.instanceId);
					return password;
			  })()
	);
	if (isValidConfigurationResult.data !== true) throw new Error("Unable to authenticate against the instance");
	connectionState.activeInstance = { ...chosenInstance, authenticated: true };
	config.activeInstance = chosenInstance;
	connectionState.availableOrganizations = (
		await api.fetchOrganizationsForInstance(
			port,
			chosenInstance,
			chosenInstance.useCredentialsFile
				? config.getCredentialsFileKey(chosenInstance.instanceId)
				: await (async () => {
						if (password != null) return password;
						password = await requestPassword(chosenInstance.instanceId);
						return password;
				  })()
		)
	).data;
	const chosenOrg = await showQuickPickForInstanceSwitching({
		connectionState,
		organizations: connectionState.availableOrganizations,
	});
	if (chosenOrg == null || chosenOrg.type !== "organization") return { password, connectionState };
	return await switchToOrganization(port, connectionState, config, chosenOrg.organization, password);
}

/**
 * Create a new instance, then make it the currently active instance to it and optionally connecto to one of its
 * organizations.
 * @param port
 * @param connectionState
 * @param config
 * @param withCredentialsFile If true, the new configuration will use a credential file.
 * @param password Password is required if the instance does not use a credentials file.
 */
async function switchToNewInstance(
	port: number,
	connectionState: ConnectionState,
	config: InstanceConfigurationProxy,
	withCredentialsFile?: boolean,
	password?: string
) {
	const {
		instance,
		availableOrganizations,
		password: pw,
	} = await registerInstance(port, config, withCredentialsFile);
	if (pw != null) password = pw;
	if (instance == null) return { password, connectionState }; // Nothing was created
	// A newly registered non null instance is already authenticated
	connectionState.activeInstance = { ...instance, authenticated: true };
	config.activeInstance = instance;
	if (availableOrganizations == null) return { password, connectionState };
	connectionState.availableOrganizations = availableOrganizations;
	const chosenOrg = await showQuickPickForInstanceSwitching({
		connectionState,
		organizations: connectionState.availableOrganizations,
	});
	if (chosenOrg == null || chosenOrg.type !== "organization" /* Type Guard */) return { password, connectionState };
	const { Success: connectionSuccessfullyEstablished, Expires } = await api.establishConnection(
		port,
		instance,
		chosenOrg.organization,
		instance.useCredentialsFile
			? config.getCredentialsFileKey(instance.instanceId)
			: await (async () => {
					if (password != null) return password;
					password = await requestPassword(instance.instanceId);
					return password;
			  })()
	);
	if (connectionSuccessfullyEstablished === true) {
		connectionState.activeOrganization = chosenOrg.organization;
	} else throw new Error("Connection not established");
	return { password, connectionState };
}

const registerSwitchInstanceCommand = (
	connector: ServerConnector,
	config: InstanceConfigurationProxy,
	refreshButtonText: (connectionState: ConnectionState) => void
) => {
	return vscode.commands.registerCommand("cody.toolkit.core.connect.switchInstance", async () => {
		try {
			connector.connectionState.connecting = true;
			refreshButtonText(connector.connectionState);
			let password: string | undefined = undefined;
			// If a preselected instance exists it isn't authenticated.
			// Offer connecting to it. If aborted clear initial connection state and offer regular
			// connection options.
			if (connector.connectionState.activeInstance?.authenticated === false) {
				try {
					({ password, connectionState: connector.connectionState } = await switchToInstance(
						connector.port,
						connector.connectionState,
						config,
						connector.connectionState.activeInstance
					));
					return;
				} catch {
					connector.connectionState.activeInstance = undefined;
					connector.connectionState.activeOrganization = undefined;
					connector.connectionState.availableOrganizations = [];
					connector.connectionState.connecting = true;
					password = undefined;
					refreshButtonText(connector.connectionState);
				}
			}
			const chosen = await showQuickPickForInstanceSwitching({
				connectionState: connector.connectionState,
				organizations: connector.connectionState.availableOrganizations,
				instances: config.instances,
				includeCreateNewOptions: true,
			});
			if (chosen == null) {
				return; // Nothing was chosen
			}
			// A new instance should be created.
			if (chosen?.type == "newInstance") {
				({ password, connectionState: connector.connectionState } = await switchToNewInstance(
					connector.port,
					connector.connectionState,
					config,
					chosen.useCredentialsFile,
					password
				));
			}
			// Switch to another instance.
			else if (
				chosen?.type == "instance" &&
				chosen.instance.instanceId !== connector.connectionState.activeInstance?.instanceId
			) {
				({ password, connectionState: connector.connectionState } = await switchToInstance(
					connector.port,
					connector.connectionState,
					config,
					chosen.instance,
					password
				));
			}
			// Switch to another organization within the same instance.
			else if (
				chosen?.type == "organization" &&
				chosen.organization.UniqueName !== connector.connectionState.activeOrganization?.UniqueName
			) {
				({ password, connectionState: connector.connectionState } = await switchToOrganization(
					connector.port,
					connector.connectionState,
					config,
					chosen.organization,
					password
				));
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
			connector.connectionState.connecting = false;
			refreshButtonText(connector.connectionState);
		}
	});
};

export async function launch({ subscriptions, workspaceState, globalState }: vscode.ExtensionContext) {
	await new ServerConnector().launchServer().then((connector) => {
		const config = new InstanceConfigurationProxy(workspaceState, globalState);
		// Preselect instance used the last time
		connector.connectionState = {
			activeInstance:
				config.activeInstance != null
					? {
							...config.activeInstance,
							authenticated: false,
					  }
					: undefined,
			activeOrganization: undefined,
			availableOrganizations: [],
			connecting: false,
		};
		const [statusBarItem, refreshButtonText] = createStatusBarItem();

		const removeInstanceCommand = vscode.commands.registerCommand(
			"cody.toolkit.core.connect.removeInstance",
			async () => removeInstance(connector.connectionState, config, refreshButtonText)
		);
		const connectToOrganizationCommand = vscode.commands.registerCommand(
			"cody.toolkit.core.connect.connectToOrganization",
			async (organization?: OrganizationConfiguration) =>
				connectToOrganization(connector.port, connector.connectionState, config, organization)
		);
		const switchInstanceCommand = registerSwitchInstanceCommand(connector, config, refreshButtonText);
		// Empty command. Just an activation trigger for other modules.
		const activateModulesCommand = vscode.commands.registerCommand("cody.toolkit.core.activateModules", () => {});
		// Make connection state available to other modules.
		const getConnectionStateCommand = vscode.commands.registerCommand(
			"cody.toolkit.core.getConnectionState",
			() => connector.connectionState
		);
		// Set initial button text.
		refreshButtonText(connector.connectionState);
		subscriptions.push(
			statusBarItem,
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

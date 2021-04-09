import * as vscode from "vscode";
import * as api from "./Api/connectionApi";
import * as path from "path";
import * as fs from "fs";
import { OrganizationConfiguration } from "./Api/connectionApi";
import { Configuration } from "./Configuration/ConfigurationProxy";
import {
	CredentialsFileInstanceConfiguration,
	InstanceConfiguration,
	InstanceConfigurationProxy,
	ManualInstanceConfiguration,
} from "./Configuration/MementoProxy";
import { install } from "./install";
import { ConnectionState, ServerConnector } from "./Utils/ServerConnector";

type SwitchInstanceQuickPickItem =
	| { instance: InstanceConfiguration; type: "instance" }
	| { organization: OrganizationConfiguration; type: "organization" }
	| { type: "newInstance"; useCredentialsFile: boolean };

// Utility methods that ask the user for mandatory info.
// If no value is provided, they just fail.
async function requestInstanceId() {
	const instanceId = await vscode.window.showInputBox({
		ignoreFocusOut: true,
		password: false,
		prompt: "Enter a unique alias for the instance.",
	});
	if (!instanceId) throw new Error("No instance id provided.");
	return instanceId;
}

async function requestPassword(instanceName: string) {
	const pw = await vscode.window.showInputBox({
		ignoreFocusOut: true,
		password: true,
		prompt: "Please enter the password for the instance " + instanceName + ".",
	});
	if (!pw) throw new Error("No password provided.");
	return pw;
}

const requestUserName = async (instanceName: string) => {
	const userName = await vscode.window.showInputBox({
		ignoreFocusOut: true,
		password: false,
		prompt: "Please enter the username for the instance " + instanceName,
	});
	if (!userName) throw new Error("No username provided");
	return userName;
};

const requestDiscoUrl = async () => {
	const discoUrl = await vscode.window.showInputBox({
		ignoreFocusOut: true,
		password: false,
		prompt:
			"Please enter the path to the discovery service. " +
			"You can usually find it by going to " +
			"Settings ➔ Customizations ➔ Developer Resources ➔ DiscoveryService",
	});
	if (!discoUrl) throw new Error("Invalid Discovery Url");
	return discoUrl;
};

const createCredentialsFile = async (instanceId: string, config: InstanceConfigurationProxy) => {
	const userName = await requestUserName(instanceId);
	const password = await requestPassword(instanceId);
	const discoveryServiceUrl = await requestDiscoUrl();
	const file = await vscode.window.showOpenDialog({
		canSelectFolders: true,
		canSelectFiles: false,
		canSelectMany: false,
		title: "Choose a Location for the Credentials File",
		openLabel: "Choose",
	});
	if (file?.length !== 1) throw new Error("No credentials file location provided");
	const credentialsFilePath = path.join(file[0].fsPath, instanceId + ".codycon");
	await api.createCredentialsFile(Configuration.backendServerPort, {
		DiscoveryServiceUrl: discoveryServiceUrl,
		CredentialsFilePath: credentialsFilePath,
		UserName: userName,
		Password: password,
		Key: config.getCredentialsFileKey(instanceId),
	});
	return credentialsFilePath;
};

/**
 * Requests a set of authentication details for connecting to a Dynamics CRM Instance using username and password.
 * If the authentication details are not valid, this will throw an error.
 * @returns Instance configuration. Also returns password for reuse across a single authentication process.
 */
async function requestInfoForUsernameAndPasswordInstance(port: number) {
	const instanceId = await requestInstanceId();
	const userName = await requestUserName(instanceId);
	const password = await requestPassword(instanceId);
	const discoveryServiceUrl = await requestDiscoUrl();
	const isValidConfigurationResponse = await api.isValidDiscoveryServiceConfiguration(
		port,
		{
			userName,
			useCredentialsFile: false,
			instanceId,
			discoveryServiceUrl,
		},
		password
	);
	if (isValidConfigurationResponse.data !== true) throw new Error("Connection to instance discovery service failed.");
	const instance: ManualInstanceConfiguration = {
		instanceId,
		discoveryServiceUrl,
		useCredentialsFile: false,
		userName: userName,
	};
	return [instance, password] as const;
}

/**
 * Requests a set of authentication details for connecting to a Dynamics CRM Instance using a credential file.
 * If the authentication details are not valid, this will throw an error.
 */
async function requestInfoForCredentialsFileInstance(port: number, config: InstanceConfigurationProxy) {
	const instanceId = await requestInstanceId();
	const credentialsFile = await createCredentialsFile(instanceId, config);
	const isValidConfigurationResponse = await api.isValidDiscoveryServiceConfiguration(
		port,
		{
			credentialsFilePath: credentialsFile,
			instanceId,
			useCredentialsFile: true,
		},
		config.getCredentialsFileKey(instanceId)
	);
	if (isValidConfigurationResponse.data !== true) throw new Error("Connection to instance discovery service failed.");
	const instance: CredentialsFileInstanceConfiguration = {
		credentialsFilePath: credentialsFile,
		instanceId: instanceId,
		useCredentialsFile: true,
	};
	return instance;
}

/**
 * Creates an item to display connection state (Instance - Organization)
 * @returns the created status bar item and a method for updating its text based on the current connection state.
 */
function createStatusBarItem() {
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
	type RefreshButtonState = {
		connecting: boolean;
		activeInstance?: InstanceConfiguration;
		activeOrganization?: api.OrganizationConfiguration;
	};
	const refreshButtonText = ({ connecting, activeInstance, activeOrganization }: RefreshButtonState) => {
		statusBarItem.text = connecting
			? "$(sync~spin) Connecting ..."
			: activeInstance == null
			? "$(debug-disconnect) No Instance - Offline"
			: activeOrganization == null
			? `$(debug-disconnect) ${activeInstance.instanceId} - Offline`
			: `$(key) ${activeInstance.instanceId} - ${activeOrganization.FriendlyName}`;
	};
	statusBarItem.tooltip = "Change Instance or Organization";
	statusBarItem.command = "cody.toolkit.core.connect.switchInstance";
	statusBarItem.text = "$(sync~spin) Starting Backend";
	statusBarItem.show();
	return [statusBarItem, refreshButtonText] as const;
}

/**
 * Utility method for turning an instance into a VS Code Quick Pick Item
 */
function instanceToQuickPick(
	instance: InstanceConfiguration,
	connectionState: ConnectionState
): vscode.QuickPickItem & { instance: InstanceConfiguration; type: "instance" } {
	return {
		instance,
		type: "instance",
		label: "Change Instance: " + instance.instanceId,
		picked: instance.instanceId === connectionState.activeInstance?.instanceId,
		description: instance.useCredentialsFile == false ? instance.discoveryServiceUrl : instance.credentialsFilePath,
	};
}

/**
 * Utility method for turning an organization into a VS Code Quick Pick Item
 */
function organizationToQuickPick(
	organization: OrganizationConfiguration
): vscode.QuickPickItem & { organization: OrganizationConfiguration; type: "organization" } {
	return {
		organization,
		type: "organization",
		label: "Change Organization: " + organization.FriendlyName,
		detail: organization.Url,
	};
}

/**
 * Utility method to create selector for connection options.
 * Will not show currently active instance and organization.
 */
function showQuickPickForInstanceSwitching({
	connectionState,
	organizations,
	instances,
	includeCreateNewOptions,
}: {
	connectionState: ConnectionState;
	organizations?: OrganizationConfiguration[];
	instances?: InstanceConfiguration[];
	includeCreateNewOptions?: boolean;
}) {
	const quickPickItems = [
		...(
			organizations?.filter((org) => org.UniqueName !== connectionState.activeOrganization?.UniqueName) ?? []
		).map(organizationToQuickPick),
		...(
			instances?.filter((inst) => inst.instanceId !== connectionState.activeInstance?.instanceId) ?? []
		).map((i) => instanceToQuickPick(i, connectionState)),
	] as (vscode.QuickPickItem & SwitchInstanceQuickPickItem)[];
	if (includeCreateNewOptions) {
		const newInstanceViaLoginDataLabel = "$(add) Create new instance via login data";
		const newInstanceViaCredentialsFileLabel = "$(add) Create new instance via credentials file";
		quickPickItems.push(
			{
				label: newInstanceViaLoginDataLabel,
				alwaysShow: true,
				type: "newInstance",
				useCredentialsFile: false,
			},
			{
				label: newInstanceViaCredentialsFileLabel,
				alwaysShow: true,
				type: "newInstance",
				useCredentialsFile: true,
			}
		);
	}
	return vscode.window.showQuickPick(quickPickItems, {
		canPickMany: false,
		ignoreFocusOut: true,
	});
}

/**
 * Delete an instance configuration. If it is the currently active instance, disconnect.
 * @param connectionState
 * @param config Memento Proxy
 * @param instance The instance to delete
 */
async function removeInstance(
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
		try {
			fs.unlinkSync(instance.credentialsFilePath);
			config.removeCredentialsFileKey(instance.instanceId);
		} catch {}
	}
	return { connectionState };
}

/**
 * Create and store a new instance configuration via a memento proxy.
 * @param port
 * @param config Memento proxy
 * @param useCredentialsFile Determines the authentication type
 * @param password Required if not using a credentials file
 */
async function registerInstance(
	port: number,
	config: InstanceConfigurationProxy,
	useCredentialsFile?: boolean,
	password?: string
): Promise<{
	instance: InstanceConfiguration;
	availableOrganizations: OrganizationConfiguration[];
	password?: string;
}> {
	if (useCredentialsFile === true) {
		const instance = await requestInfoForCredentialsFileInstance(port, config);
		config.addInstance(instance);
		const availableOrganizationsResponse = await api.fetchOrganizationsForInstance(
			port,
			instance,
			config.getCredentialsFileKey(instance.instanceId)
		);
		return { instance, availableOrganizations: availableOrganizationsResponse.data };
	} else {
		const [instance, password] = await requestInfoForUsernameAndPasswordInstance(port);
		config.addInstance(instance);
		const availableOrganizationsResponse = await api.fetchOrganizationsForInstance(port, instance, password);
		// Return password so that it can be reused across one authentication process.
		return { instance, availableOrganizations: availableOrganizationsResponse.data, password };
	}
}

/**
 * Connect to one of the available organizations for the current instance.
 * @param port
 * @param connectionState
 * @param chosenOrganization
 * @param password Required if the instance is not using a credentials file
 */
async function switchToOrganization(
	port: number,
	connectionState: ConnectionState,
	config: InstanceConfigurationProxy,
	chosenOrganization?: OrganizationConfiguration,
	password?: string
) {
	if (connectionState.activeInstance == null) throw new Error("Chose org without active instance");
	if (chosenOrganization == null) return { password, connectionState };
	const connectionAliveResponse = await api.connectionAlive(port, chosenOrganization.UniqueName);
	if (connectionAliveResponse) {
		connectionState.activeOrganization = chosenOrganization;
		return { password, connectionState };
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
	const { instance, availableOrganizations, password: pw } = await registerInstance(
		port,
		config,
		withCredentialsFile,
		password
	);
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

const registerRemoveInstanceCommand = (
	connector: ServerConnector,
	config: InstanceConfigurationProxy,
	refreshButtonText: (connectionState: ConnectionState) => void
) => {
	return vscode.commands.registerCommand("cody.toolkit.core.connect.removeInstance", async () => {
		const chosenInstance = await vscode.window.showQuickPick(
			config.instances.map((i) => instanceToQuickPick(i, connector.connectionState)),
			{
				ignoreFocusOut: true,
				canPickMany: false,
			}
		);
		if (chosenInstance == null) return;
		({ connectionState: connector.connectionState } = await removeInstance(
			connector.connectionState,
			config,
			chosenInstance.instance
		));
		refreshButtonText(connector.connectionState);
	});
};

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

export function launch({ subscriptions, workspaceState, globalState }: vscode.ExtensionContext) {
	new ServerConnector()
		.launchServer()
		.then((connector) => {
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
			const removeInstanceCommand = registerRemoveInstanceCommand(connector, config, refreshButtonText);
			const switchInstanceCommand = registerSwitchInstanceCommand(connector, config, refreshButtonText);
			// Empty command. Just an activation trigger for other modules.
			const activateModulesCommand = vscode.commands.registerCommand(
				"cody.toolkit.core.activateModules",
				() => {}
			);
			// Make connection state available to other modules.
			const getConnectionStateCommand = vscode.commands.registerCommand(
				"cody.toolkit.core.getConnectionState",
				() => connector.connectionState
			);
			// Set initial button text.
			refreshButtonText(connector.connectionState);
			subscriptions.push(
				statusBarItem,
				switchInstanceCommand,
				removeInstanceCommand,
				activateModulesCommand,
				getConnectionStateCommand
			);
		})
		.catch((e) => {
			if (e instanceof Error) {
				vscode.window.showErrorMessage(e.message);
			}
			throw e;
		});
}

export function activate(context: vscode.ExtensionContext) {
	if (!!!Configuration.backendServerLocation) {
		install(context, launch);
	} else {
		launch(context);
	}
}

export function deactivate() {}

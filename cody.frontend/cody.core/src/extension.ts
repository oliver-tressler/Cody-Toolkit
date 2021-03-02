import { exec } from "child_process";
import * as vscode from "vscode";
import * as api from "./Api/connectionApi";
import { OrganizationConfiguration } from "./Api/connectionApi";
import { Configuration } from "./Configuration/ConfigurationProxy";
import {
	CredentialsFileInstanceConfiguration,
	InstanceConfiguration,
	InstanceConfigurationProxy,
	ManualInstanceConfiguration,
} from "./Configuration/MementoProxy";
import { FileInfo } from "./Utils/FileInfo";
import { ServerConnector } from "./Utils/ServerConnector";

type SwitchInstanceQuickPickItem =
	| { instance: InstanceConfiguration; type: "instance" }
	| { organization: OrganizationConfiguration; type: "organization" }
	| { type: "newInstance"; useCredentialsFile: boolean };

type ConnectionState = {
	activeInstance?: InstanceConfiguration & { authenticated: boolean };
	activeOrganization?: api.OrganizationConfiguration;
	availableOrganizations: api.OrganizationConfiguration[];

	connecting: boolean;
};

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
			"Settings -> Customizations -> Developer Resources -> DiscoveryService",
	});
	if (!discoUrl) throw new Error("Invalid Discovery Url");
	return discoUrl;
};

const requestCredentialsFileLocation = async (instanceName: string) => {
	const file = await vscode.window.showOpenDialog({
		canSelectFiles: true,
		canSelectFolders: false,
		canSelectMany: false,
		title: "Choose Credentials File " + instanceName,
		filters: { "XML Files": ["xml", "XML"] },
		openLabel: "Use",
	});
	if (file?.length !== 1) throw new Error("No credentials file selected");
	return file[0].fsPath;
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
async function requestInfoForCredentialsFileInstance(port: number) {
	const instanceId = await requestInstanceId();
	const credentialsFile = await requestCredentialsFileLocation(instanceId);
	const isValidConfigurationResponse = await api.isValidDiscoveryServiceConfiguration(port, {
		credentialsFilePath: credentialsFile,
		instanceId,
		useCredentialsFile: true,
	});
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
		const instance = await requestInfoForCredentialsFileInstance(port);
		config.addInstance(instance);
		const availableOrganizationsResponse = await api.fetchOrganizationsForInstance(port, instance, password);
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
			? undefined
			: await (async () => {
					if (password != null) return password;
					password = await requestPassword(connectionState.activeInstance!.instanceId);
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
			? undefined
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
				? undefined
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
	return await switchToOrganization(port, connectionState, chosenOrg.organization, password);
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
			? undefined
			: await (async () => {
					if (password != null) return password;
					password = await requestPassword(instance.instanceId);
					return password;
			  })()
	);
	if (connectionSuccessfullyEstablished === true) {
		connectionState.activeOrganization = chosenOrg.organization;
	} else throw new Error("Connection not established");
	if (Expires)
		setTimeout(async () => {
			if (
				connectionState.activeInstance?.instanceId === instance.instanceId &&
				connectionState.activeOrganization?.UniqueName === chosenOrg.organization.UniqueName
			) {
				await vscode.window.showInformationMessage("Your CRM Connection is about to expire", "Reconnect");
			}
		}, new Date().getTime() - Expires.getTime() - 28800000);
	return { password, connectionState };
}

const registerRemoveInstanceCommand = (
	connectionState: ConnectionState,
	config: InstanceConfigurationProxy,
	refreshButtonText: (connectionState: ConnectionState) => void
) => {
	return vscode.commands.registerCommand("cody.toolkit.core.connect.removeInstance", async () => {
		const chosenInstance = await vscode.window.showQuickPick(
			config.instances.map((i) => instanceToQuickPick(i, connectionState)),
			{
				ignoreFocusOut: true,
				canPickMany: false,
			}
		);
		if (chosenInstance == null) return;
		({ connectionState } = await removeInstance(connectionState, config, chosenInstance.instance));
		refreshButtonText(connectionState);
	});
};

const registerSwitchInstanceCommand = (
	connector: ServerConnector,
	connectionState: ConnectionState,
	config: InstanceConfigurationProxy,
	refreshButtonText: (connectionState: ConnectionState) => void
) => {
	return vscode.commands.registerCommand("cody.toolkit.core.connect.switchInstance", async () => {
		try {
			connectionState.connecting = true;
			refreshButtonText(connectionState);
			let password: string | undefined = undefined;
			// If a preselected instance exists it isn't authenticated.
			// Offer connecting to it. If aborted clear initial connection state and offer regular
			// connection options.
			if (connectionState.activeInstance?.authenticated === false) {
				try {
					({ password, connectionState } = await switchToInstance(
						connector.port,
						connectionState,
						config,
						connectionState.activeInstance
					));
					return;
				} catch {
					connectionState.activeInstance = undefined;
					password = undefined;
					connectionState.connecting = true;
					refreshButtonText(connectionState);
				}
			}
			const chosen = await showQuickPickForInstanceSwitching({
				connectionState,
				organizations: connectionState.availableOrganizations,
				instances: config.instances,
				includeCreateNewOptions: true,
			});
			if (chosen == null) {
				return; // Nothing was chosen
			}
			// A new instance should be created.
			if (chosen?.type == "newInstance") {
				({ password, connectionState } = await switchToNewInstance(
					connector.port,
					connectionState,
					config,
					chosen.useCredentialsFile,
					password
				));
			}
			// Switch to another instance.
			else if (
				chosen?.type == "instance" &&
				chosen.instance.instanceId !== connectionState.activeInstance?.instanceId
			) {
				({ password, connectionState } = await switchToInstance(
					connector.port,
					connectionState,
					config,
					chosen.instance,
					password
				));
			}
			// Switch to another organization within the same instance.
			else if (
				chosen?.type == "organization" &&
				chosen.organization.UniqueName !== connectionState.activeOrganization?.UniqueName
			) {
				({ password, connectionState } = await switchToOrganization(
					connector.port,
					connectionState,
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
			connectionState.connecting = false;
			refreshButtonText(connectionState);
		}
	});
};

export function launch({ subscriptions, workspaceState }: vscode.ExtensionContext) {
	new ServerConnector()
		.launchServer()
		.then((connector) => {
			const config = new InstanceConfigurationProxy(workspaceState);
			// Preselect instance used the last time
			let connectionState: ConnectionState = {
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
			const removeInstanceCommand = registerRemoveInstanceCommand(connectionState, config, refreshButtonText);
			const switchInstanceCommand = registerSwitchInstanceCommand(
				connector,
				connectionState,
				config,
				refreshButtonText
			);
			// Empty command. Just an activation trigger for other modules.
			const activateModulesCommand = vscode.commands.registerCommand(
				"cody.toolkit.core.activateModules",
				() => {}
			);
			// Set initial button text.
			refreshButtonText(connectionState);
			subscriptions.push(statusBarItem, switchInstanceCommand, removeInstanceCommand, activateModulesCommand);
		})
		.catch((e) => {
			if (e instanceof Error) {
				vscode.window.showErrorMessage(e.message);
			}
			throw e;
		});
}

/**
 * Run if configuration is not complete
 * @param context
 */
async function install(context: vscode.ExtensionContext) {
	// Ask the user if he wants do install cody
	const shouldInstall =
		(await vscode.window.showInformationMessage(
			"Cody Toolkit requires that you specify the path to the backend server.",
			"Configure"
		)) === "Configure";
	if (!shouldInstall) return;
	// Get the exe file for the backend server
	const backendServerLocation = await vscode.window.showOpenDialog({
		canSelectFiles: true,
		canSelectFolders: false,
		canSelectMany: false,
		openLabel: "Choose",
		filters: { Executable: ["exe", "EXE"] },
		title: "Select Cody Toolkit Backend Executable",
	});
	if (backendServerLocation == null || backendServerLocation.length == 0) return;
	Configuration.backendServerLocation = new FileInfo(
		backendServerLocation[0].fsPath,
		Configuration.projectRootPath
	).asForwardSlash().file;
	// Ask for the port
	const portOkResponse = await vscode.window.showInformationMessage(
		"The port that will be used is " + Configuration.backendServerPort + ". Is that okay with you?",
		"Yes, Let's Go",
		"Configure"
	);
	// Close icon clicked
	if (portOkResponse == null) return;
	// Port specified in config is fine
	if (portOkResponse == "Let's Go") {
		launch(context);
		return;
	}
	// Configure port
	const port = await vscode.window.showInputBox({
		value: Configuration.backendServerPort.toString(),
		ignoreFocusOut: true,
		prompt: "Please enter the port that should be used to communicate with the Cody Toolkit Backend",
	});
	if (port == null) return;
	if (isNaN(parseInt(port))) {
		vscode.window.showErrorMessage("Not a valid port");
		return;
	}
	Configuration.backendServerPort = parseInt(port);
	launch(context);
}

export function activate(context: vscode.ExtensionContext) {
	if (Configuration.backendServerLocation == null) {
		install(context);
	} else {
		launch(context);
	}
}

export function deactivate() {}

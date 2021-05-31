import * as path from "path";
import * as vscode from "vscode";
import * as api from "../Api/connectionApi";
import {
	CredentialsFileInstanceConfiguration,
	InstanceConfiguration,
	InstanceConfigurationProxy,
	ManualInstanceConfiguration
} from "../Configuration/MementoProxy";
import { ConnectionState, OrganizationConfiguration } from "../connectionState";
import { instanceToQuickPick, organizationToQuickPick, SwitchInstanceQuickPickItem } from "./quickPickConverters";

/**
 * Utility method to create selector for connection options.
 * Will not show currently active instance and organization.
 */
export function showQuickPickForInstanceSwitching({
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
		...(instances?.filter((inst) => inst.instanceId !== connectionState.activeInstance?.instanceId) ?? []).map(
			(i) => instanceToQuickPick(i, connectionState)
		),
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

// Utility methods that ask the user for mandatory info.
// If no value is provided, they just fail.
export async function requestInstanceId() {
	const instanceId = await vscode.window.showInputBox({
		ignoreFocusOut: true,
		password: false,
		prompt: "Enter a unique alias for the instance.",
	});
	if (!instanceId) throw new Error("No instance id provided.");
	return instanceId;
}

export async function requestPassword(instanceName: string) {
	const pw = await vscode.window.showInputBox({
		ignoreFocusOut: true,
		password: true,
		prompt: "Please enter the password for the instance " + instanceName + ".",
	});
	if (!pw) throw new Error("No password provided.");
	return pw;
}

export async function requestUserName(instanceName: string) {
	const userName = await vscode.window.showInputBox({
		ignoreFocusOut: true,
		password: false,
		prompt: "Please enter the username for the instance " + instanceName,
	});
	if (!userName) throw new Error("No username provided");
	return userName;
}

export async function requestDiscoUrl() {
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
}

export async function chooseInstance(instances: InstanceConfiguration[], connectionState: ConnectionState) {
	const chosenInstance = await vscode.window.showQuickPick(
		instances.map((i) => instanceToQuickPick(i, connectionState)),
		{
			ignoreFocusOut: true,
			canPickMany: false,
		}
	);
	return chosenInstance;
}

/**
 * Requests a set of authentication details for connecting to a Dynamics CRM Instance using username and password.
 * If the authentication details are not valid, this will throw an error.
 * @returns Instance configuration. Also returns password for reuse across a single authentication process.
 */
export async function requestInfoForUsernameAndPasswordInstance() {
	const instanceId = await requestInstanceId();
	const userName = await requestUserName(instanceId);
	const password = await requestPassword(instanceId);
	const discoveryServiceUrl = await requestDiscoUrl();
	const instance: ManualInstanceConfiguration = {
		instanceId,
		discoveryServiceUrl,
		useCredentialsFile: false,
		userName: userName,
	};
	return [instance, password] as const;
}

export async function createCredentialsFile(instanceId: string, config: InstanceConfigurationProxy) {
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
	await api.createCredentialsFile({
		DiscoveryServiceUrl: discoveryServiceUrl,
		CredentialsFilePath: credentialsFilePath,
		UserName: userName,
		Password: password,
		Key: config.getCredentialsFileKey(instanceId),
	});
	return credentialsFilePath;
}

/**
 * Requests a set of authentication details for connecting to a Dynamics CRM Instance using a credential file.
 * If the authentication details are not valid, this will throw an error.
 */
export async function requestInfoForCredentialsFileInstance(config: InstanceConfigurationProxy) {
	const instanceId = await requestInstanceId();
	const credentialsFile = await createCredentialsFile(instanceId, config);
	const instance: CredentialsFileInstanceConfiguration = {
		credentialsFilePath: credentialsFile,
		instanceId: instanceId,
		useCredentialsFile: true,
	};
	return [instance, config.getCredentialsFileKey(instanceId)] as const;
}

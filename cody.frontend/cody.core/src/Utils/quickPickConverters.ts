import * as vscode from "vscode";
import { InstanceConfiguration } from "../Configuration/MementoProxy";
import { OrganizationConfiguration, ConnectionState } from "../connectionState";

export type SwitchInstanceQuickPickItem =
	| { instance: InstanceConfiguration; type: "instance" }
	| { organization: OrganizationConfiguration; type: "organization" }
	| { type: "newInstance"; useCredentialsFile: boolean };

/**
 * Utility method for turning an instance into a VS Code Quick Pick Item
 */
export function instanceToQuickPick(
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
export function organizationToQuickPick(
	organization: OrganizationConfiguration
): vscode.QuickPickItem & { organization: OrganizationConfiguration; type: "organization" } {
	return {
		organization,
		type: "organization",
		label: "Change Organization: " + organization.FriendlyName,
		detail: organization.Url,
	};
}

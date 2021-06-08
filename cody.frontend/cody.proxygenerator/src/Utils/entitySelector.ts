import { retrieveAvailableEntities } from "../Api/api";
import { Configuration } from "../Configuration/ConfigurationProxy";
import { AvailableEntity } from "../sharedTypings";
import { AuthorizedConnectionState } from "./connection";
import * as vscode from "vscode";

/**
 * Prompt the user to enter entity logical names as a comma separated list.
 * @returns cleansed logical names of user-provided entities
 */
async function chooseEntitiesViaFreeText(connectionState: AuthorizedConnectionState) {
	const entities = await vscode.window.showInputBox({
		ignoreFocusOut: true,
		placeHolder: "Example: salesorderdetail, new_customentity",
		prompt: "Please enter the logical names of the entities that you want to generate proxies for.",
		validateInput: (val) => {
			return val
				.split(",")
				.filter(Boolean)
				.every((logicalName) => new RegExp(/^\s*\w+\s*$/).test(logicalName))
				? null
				: "Only alphanumeric characters and the underscore are allowed in entity logical names";
		},
	});
	const logicalNames = entities
		?.split(",")
		.map((logicalName) => logicalName.trim())
		.filter(Boolean);
	if (logicalNames == null || logicalNames.length === 0) {
		throw new Error("No entity names provided");
	}
	return {
		connectionState,
		entities: logicalNames,
	};
}

function availableEntityToQuickPick(entity: AvailableEntity): vscode.QuickPickItem {
	return {
		label: entity.LogicalName,
		description: entity.DisplayName,
		detail: entity.Description,
	};
}

/**
 * Retrieve all available entities from the Dynamics CRM 2016 server and offer selection via a multi-select prompt.
 * @returns logical names of selected entities
 */
async function chooseEntitiesViaQuickPick(connectionState: AuthorizedConnectionState) {
	const availableEntitiesResponse = retrieveAvailableEntities(
		connectionState.activeOrganization.UniqueName
	).then((val) => val.data.map(availableEntityToQuickPick));

	const selected = await vscode.window.showQuickPick(availableEntitiesResponse, {
		canPickMany: true,
		ignoreFocusOut: true,
		matchOnDescription: true,
	});
	const logicalNames = selected?.map((s) => s.label);
	if (logicalNames == null || logicalNames.length === 0) {
		throw new Error("No entity names provided");
	}
	return {
		connectionState,
		entities: logicalNames,
	};
}

export async function chooseEntities(connectionState: AuthorizedConnectionState) {
	return Configuration.selectionMode === "QuickPick"
		? chooseEntitiesViaQuickPick(connectionState)
		: chooseEntitiesViaFreeText(connectionState);
}

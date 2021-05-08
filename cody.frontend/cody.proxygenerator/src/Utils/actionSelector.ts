import { retrieveAvailableActions } from "../Api/api";
import { Configuration } from "../Configuration/ConfigurationProxy";
import { AvailableAction } from "../sharedTypings";
import { AuthorizedConnectionState } from "./connection";
import * as vscode from "vscode";

function availableActionToQuickPick(action: AvailableAction): vscode.QuickPickItem {
	return {
		label: action.Name,
		description: action.DisplayName + (action.PrimaryEntityName ? `(${action.PrimaryEntityName})` : ""),
	};
}

async function chooseActionsViaFreeText(connectionState: AuthorizedConnectionState) {
	const actions = await vscode.window.showInputBox({
		ignoreFocusOut: true,
		placeHolder: "Example: new_customaction1, new_customaction2",
		prompt:
			"Please enter the unique names (incl. vendor prefix) of the actions that you want to generate proxies for",
		validateInput: (val) => {
			return val
				.split(",")
				.filter(Boolean)
				.every((logicalName) => new RegExp(/^\s*\w+\s*$/).test(logicalName))
				? null
				: "Only alphanumeric characters and the underscore are allowed in action names";
		},
	});
	const names = actions
		?.split(",")
		.map((logicalName) => logicalName.trim())
		.filter(Boolean);
	if (names == null || names.length === 0) {
		throw new Error("No entity names provided");
	}
	return {
		connectionState,
		actions: names,
	};
}

async function chooseActionsViaQuickPick(connectionState: AuthorizedConnectionState) {
	const availableActionsResponse = retrieveAvailableActions(
		connectionState.activeOrganization.UniqueName
	).then((val) => val.data.map(availableActionToQuickPick));
	const selected = await vscode.window.showQuickPick(availableActionsResponse, {
		canPickMany: true,
		ignoreFocusOut: true,
		matchOnDescription: true,
	});
	const names = selected?.map((s) => s.label);
	if (names == null || names.length === 0) {
		throw new Error("No actions selected");
	}
	return {
		connectionState,
		actions: names,
	};
}

export async function chooseActions(connectionState: AuthorizedConnectionState) {
	return Configuration.selectionMode === "QuickPick"
		? chooseActionsViaQuickPick(connectionState)
		: chooseActionsViaFreeText(connectionState);
}

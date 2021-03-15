import { normalize } from "path";
import * as vscode from "vscode";
import {
	generateEntityProxies as apiGenerateEntityProxies,
	generateActionProxies as apiGenerateActionProxies,
	retrieveAvailableActions,
	retrieveAvailableEntities,
} from "./Api/api";
import { Configuration, TypeScriptConfiguration } from "./Configuration/ConfigurationProxy";
import { ConnectionState, getConnectionState } from "./connection";
import { AvailableAction, AvailableEntity, GenerateProxyCommandProvider } from "./sharedTypings";

/**
 * Make sure that the user is logged in to an organization.
 */
async function assertConnection() {
	const state = await getConnectionState();
	if (state?.activeOrganization?.UniqueName == null) {
		throw new Error("Unauthorized");
	}
	return state as AuthorizedConnectionState;
}

type AuthorizedConnectionState = ConnectionState & {
	activeOrganization: { UniqueName: string };
};

/**
 * Prompt the user for the typescript proxy folder location.
 */
async function requestTsProxyFolderLocation() {
	const proxyFolder = await vscode.window.showOpenDialog({
		canSelectFiles: false,
		canSelectFolders: true,
		canSelectMany: false,
		openLabel: "Select",
		title: "Select the folder to store TS Proxy files in",
	});
	if (proxyFolder?.length !== 1) {
		throw new Error("A typescript proxy folder needs to be specified in the Configuration");
	}
	return normalize(proxyFolder[0].fsPath);
}

/**
 * Make sure that all configuration values are set.
 */
async function assertConfigurationPresent() {
	if (!TypeScriptConfiguration.proxyFolder) {
		TypeScriptConfiguration.proxyFolder = await requestTsProxyFolderLocation();
	}
}

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
		connectionState.activeOrganization!.UniqueName
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

async function chooseEntities(connectionState: AuthorizedConnectionState) {
	return Configuration.selectionMode === "QuickPick"
		? chooseEntitiesViaQuickPick(connectionState)
		: chooseEntitiesViaFreeText(connectionState);
}

function startEntityProxyGeneration({
	connectionState,
	entities,
}: {
	connectionState: AuthorizedConnectionState;
	entities: string[] | undefined;
}) {
	if (entities != null && entities.length === 0) {
		return;
	}
	return apiGenerateEntityProxies({
		entitiyLogicalNames: entities ?? [],
		language: "ts",
		organization: connectionState.activeOrganization.UniqueName,
		path: TypeScriptConfiguration.proxyFolder,
		globalEnums: TypeScriptConfiguration.globalEnums === true,
	});
}

/**
 * Let the user choose which proxies to generate.
 */
async function generateEntityProxies() {
	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Window,
			cancellable: false,
			title: "Generating Proxies",
		},
		() => assertConfigurationPresent().then(assertConnection).then(chooseEntities).then(startEntityProxyGeneration)
	);
}

/**
 * Read the proxy folder and regenerate all files that have a matching logical name.
 */
async function regenerateAllEntityProxies() {
	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Window,
			cancellable: false,
			title: "Generating Proxies",
		},
		() =>
			assertConfigurationPresent()
				.then(assertConnection)
				.then((connectionState) => ({ entities: undefined, connectionState }))
				.then(startEntityProxyGeneration)
	);
}

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
		connectionState.activeOrganization!.UniqueName
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

async function chooseActions(connectionState: AuthorizedConnectionState) {
	return Configuration.selectionMode === "QuickPick"
		? chooseActionsViaQuickPick(connectionState)
		: chooseActionsViaFreeText(connectionState);
}

function startActionProxyGeneration({
	connectionState,
	actions,
}: {
	connectionState: AuthorizedConnectionState;
	actions?: string[];
}) {
	if (actions != null && actions.length === 0) {
		return;
	}
	return apiGenerateActionProxies({
		actionNames: actions ?? [],
		language: "ts",
		organization: connectionState.activeOrganization.UniqueName,
		path: TypeScriptConfiguration.proxyFolder,
	});
}

async function generateActionProxies() {
	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Window,
			cancellable: false,
			title: "Generating Proxies",
		},
		() => assertConfigurationPresent().then(assertConnection).then(chooseActions).then(startActionProxyGeneration)
	);
}

async function regenerateAllActionProxies() {
	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Window,
			cancellable: false,
			title: "Generating Proxies",
		},
		() =>
			assertConfigurationPresent()
				.then(assertConnection)
				.then((connectionState) => ({ entities: undefined, connectionState }))
				.then(startActionProxyGeneration)
	);
}

export const tsCommandProvider: GenerateProxyCommandProvider = {
	languageAbbreviation: "ts",
	commands: {
		generateEntityProxies,
		generateActionProxies,
		regenerateAllEntityProxies,
		regenerateAllActionProxies
	},
};

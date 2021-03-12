import { normalize } from "path";
import * as vscode from "vscode";
import { generateProxies as apiGenerateProxies, retrieveAvailableEntities } from "./Api/api";
import { Configuration, TypeScriptConfiguration } from "./Configuration/ConfigurationProxy";
import { ConnectionState, getConnectionState } from "./connection";
import { AvailableEntity, GenerateProxyCommandProvider } from "./sharedTypings";
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

async function assertConfigurationPresent() {
	if (!TypeScriptConfiguration.proxyFolder) {
		TypeScriptConfiguration.proxyFolder = await requestTsProxyFolderLocation();
	}
}

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

function startProxyGeneration({
	connectionState,
	entities,
}: {
	connectionState: AuthorizedConnectionState;
	entities: string[] | undefined;
}) {
	if (entities != null && entities.length === 0) {
		return;
	}
	return apiGenerateProxies({
		entitiyLogicalNames: entities ?? [],
		language: "ts",
		organization: connectionState.activeOrganization.UniqueName,
		path: TypeScriptConfiguration.proxyFolder,
		globalEnums: TypeScriptConfiguration.globalEnums === true,
	});
}

async function generateProxies() {
	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.Window,
			cancellable: false,
			title: "Generating Proxies",
		},
		() => assertConfigurationPresent().then(assertConnection).then(chooseEntities).then(startProxyGeneration)
	);
}

async function regenerateAllProxies() {
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
				.then(startProxyGeneration)
	);
}

export const tsCommandProvider: GenerateProxyCommandProvider = {
	languageAbbreviation: "ts",
	commands: {
		generateProxies,
		regenerateAllProxies,
	},
};

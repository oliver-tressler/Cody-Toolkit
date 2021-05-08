import { normalize } from "path";
import * as vscode from "vscode";
import {
	generateActionProxies as apiGenerateActionProxies,
	generateEntityProxies as apiGenerateEntityProxies,
} from "./Api/api";
import { CSharpConfiguration, TypeScriptConfiguration } from "./Configuration/ConfigurationProxy";
import { GenerateProxyCommandProvider } from "./sharedTypings";
import { chooseActions } from "./Utils/actionSelector";
import { assertConnection, AuthorizedConnectionState } from "./Utils/connection";
import { chooseEntities } from "./Utils/entitySelector";

/**
 * Prompt the user for the typescript proxy folder location.
 */
async function requestCsProxyFolderLocation() {
	const proxyFolder = await vscode.window.showOpenDialog({
		canSelectFiles: false,
		canSelectFolders: true,
		canSelectMany: false,
		openLabel: "Select",
		title: "Select the folder to store CS Proxy files in",
	});
	if (proxyFolder?.length !== 1) {
		throw new Error("A C# proxy folder needs to be specified in the Configuration");
	}
	return normalize(proxyFolder[0].fsPath);
}

/**
 * Make sure that all configuration values are set.
 */
async function assertConfigurationPresent() {
	if (!TypeScriptConfiguration.proxyFolder) {
		TypeScriptConfiguration.proxyFolder = await requestCsProxyFolderLocation();
	}
}

async function startEntityProxyGeneration({
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
		language: "cs",
		organization: connectionState.activeOrganization.UniqueName,
		path: CSharpConfiguration.proxyFolder,
		globalEnums: CSharpConfiguration.globalEnums === true,
		proxyNamespace: CSharpConfiguration.namespace,
		mode: CSharpConfiguration.proxyLayout ?? "XrmToolkit",
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
		language: "cs",
		organization: connectionState.activeOrganization.UniqueName,
		path: CSharpConfiguration.proxyFolder,
		mode: CSharpConfiguration.proxyLayout ?? "XrmToolkit",
		proxyNamespace: CSharpConfiguration.namespace,
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
	languageAbbreviation: "cs",
	commands: {
		generateEntityProxies,
		generateActionProxies,
		regenerateAllEntityProxies,
		regenerateAllActionProxies,
	},
};

import { AxiosResponse } from "axios";
import { normalize } from "path";
import * as vscode from "vscode";
import {
	generateActionProxies as apiGenerateActionProxies,
	generateEntityProxies as apiGenerateEntityProxies,
	retrieveAvailableActions,
} from "./Api/api";
import { Configuration, TypeScriptConfiguration } from "./Configuration/ConfigurationProxy";
import { AvailableAction, AvailableEntity, GenerateProxyCommandProvider } from "./sharedTypings";
import { chooseActions } from "./Utils/actionSelector";
import { assertConnection, AuthorizedConnectionState } from "./Utils/connection";
import { chooseEntities } from "./Utils/entitySelector";
import { isSubDirOrEqualDir } from "./Utils/fsUtils";

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
 * Somehow the typescript language server has issues with new files being created when paths are used. This restarts the
 * typescript server if the proxy file would be newly created, if the command is available and one of the open workspace
 * folders is a parent dir of the configured proxy folder.
 */
async function withTsServerRestartIfRequired<T extends AxiosResponse<{ CreatedNewFiles: boolean }>>(
	delegate: Promise<T>
): Promise<T | undefined> {
	let delegateResult: T | undefined = await delegate;
	try {
		if (
			TypeScriptConfiguration.restartTsLanguageServerWhenCreatingNewFiles &&
			delegateResult.data.CreatedNewFiles && // This is way cleaner than using a file system watcher
			vscode.workspace.workspaceFolders?.some(
				(wf) => isSubDirOrEqualDir(wf.uri.fsPath, TypeScriptConfiguration.proxyFolder) // only if one of the workspace folders is the proxy folder
			) === true &&
			(await vscode.commands.getCommands(true)).includes("typescript.restartTsServer") // only if command available
		) {
			vscode.commands.executeCommand("typescript.restartTsServer");
		}
	} catch {
		// Fail silently for this one. This does not need to bother the user.
	}
	return delegateResult;
}

/**
 * Make sure that all configuration values are set.
 */
async function assertConfigurationPresent() {
	if (!TypeScriptConfiguration.proxyFolder) {
		TypeScriptConfiguration.proxyFolder = await requestTsProxyFolderLocation();
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
	return withTsServerRestartIfRequired(
		apiGenerateEntityProxies({
			entitiyLogicalNames: entities ?? [],
			language: "ts",
			organization: connectionState.activeOrganization.UniqueName,
			path: TypeScriptConfiguration.proxyFolder,
			globalEnums: TypeScriptConfiguration.globalEnums === true,
		})
	);
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
	return withTsServerRestartIfRequired(
		apiGenerateActionProxies({
			actionNames: actions ?? [],
			language: "ts",
			organization: connectionState.activeOrganization.UniqueName,
			path: TypeScriptConfiguration.proxyFolder,
		})
	);
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
		regenerateAllActionProxies,
	},
};

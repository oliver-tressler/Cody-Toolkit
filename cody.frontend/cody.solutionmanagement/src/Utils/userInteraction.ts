import * as path from "path";
import * as vscode from "vscode";
import {
	AssemblyInfo,
	PluginInfo,
	PublisherInfo,
	retrieveAssemblies,
	retrievePublishers,
	retrieveSolutions,
	retrieveWebResources,
	SolutionInfo,
	StepInfo,
	WebResourceInfo,
} from "../Api/Api";
import { Configuration } from "../Configuration/ConfigurationProxy";
import { PreferredPublisherProxy } from "../Configuration/MementoProxy";
import type { GitExtension } from "../Vendor/git";
import { ConnectionState } from "./connection";
export type Progress = vscode.Progress<{ message: string }>;

/**
 * Check if a given dir is equal to or a subdirectory of another dir
 * @param parent fsPath (dir)
 * @param child fsPath (dir)
 */
function isSubDirOrEqualDir(parent: string, child: string) {
	const parentPath = path.parse(parent);
	const childPath = path.parse(child);
	if (parentPath.dir == childPath.dir) return true;
	const rel = path.relative(parent, child);
	return rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * Tries to fetch the current branch name from the vscode.git extension. If the extension is not installed, this will
 * just return undefined. The git repository is matched by getting the path of the first workspace folder and testing
 * if it is a subfolder of any of the currently active git repositories root folders.
 */
function tryToGetGitBranchName(): string | undefined {
	const extension = vscode.extensions.getExtension("vscode.git")?.exports as GitExtension;
	const projectPath = !vscode.workspace.workspaceFolders
		? undefined
		: vscode.workspace.workspaceFolders.length === 0
		? undefined
		: vscode.workspace.workspaceFolders[0].uri.fsPath;
	if (extension?.enabled !== true || projectPath == null) return undefined;
	try {
		const api = extension.getAPI(1);
		const repo = projectPath
			? api.repositories.find((r) => isSubDirOrEqualDir(r.rootUri.fsPath, projectPath))
			: undefined;
		if (repo == null || repo.state.HEAD == null) return undefined;
		const { name } = repo.state.HEAD;
		return name;
	} catch {
		return undefined;
	}
}

/**
 * Takes the name of a git branch and checks if it should be excluded given the regex that can be provided via
 * ignoreTheseBranchNamesForSolutionNameSuggestions. The name will be transformed according to these steps:
 * 1: Split the string at every slash (allows detecting feature branches, etc)
 * 2: For each resulting group, throw out all non alphanumeric characters
 * 3: Per group, wherever characters are thrown out, a word break is assumed
 * 4: Capitalize all words in a group
 * 5: Merge words in a group so they are written in Pascal Case
 * 6: Merge groups with _ separator
 *
 * @param branchName Name of the active git branch
 */
function gitBranchNameToSolutionName(branchName: string | undefined) {
	if (branchName == null) return undefined;
	try {
		// Attempt to parse user provided regex and test if it matches branch name
		if (Configuration.ignoreTheseBranchNamesForSolutionNameSuggestions) {
			const regex = new RegExp(Configuration.ignoreTheseBranchNamesForSolutionNameSuggestions);
			if (regex.test(branchName) === true) return undefined;
		}
	} catch {
		vscode.window.showErrorMessage(
			"The RegExp you entered at Cody Toolkit > Solution Management > ignoreTheseBranchNamesForSolutionNameSuggestions is invalid"
		);
	}
	// See method description for what's going on here
	const groups = branchName
		.split("/")
		.map((g) => {
			// use underscore as available split operator
			const toUnderScore = g.replace(/([^0-9a-zA-Z])+/g, "_").replace(/^_|_$/, "");
			const toUpperCase = toUnderScore
				.split("_")
				.filter(Boolean)
				.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
				.join("");
			return toUpperCase;
		})
		.filter(Boolean);
	return groups.join("_");
}

function publisherToQuickPick(publisher: PublisherInfo): vscode.QuickPickItem & { info: PublisherInfo } {
	return {
		label: publisher.Name,
		description: publisher.Description,
		detail: `${publisher.UniqueName} (Prefix: ${publisher.Prefix})`,
		info: publisher,
	};
}

function solutionToQuickPick(solution: SolutionInfo): vscode.QuickPickItem & { info: SolutionInfo } {
	return {
		info: solution,
		label: `${solution.Name} (${solution.Publisher.Name})`,
		detail: solution.Description,
		description: solution.Version,
	};
}

function webResourceToQuickPick(webResource: WebResourceInfo): vscode.QuickPickItem & { info: WebResourceInfo } {
	return {
		info: webResource,
		label: webResource.DisplayName ?? webResource.Name,
		detail: [webResource.Name, webResource.Description].filter(Boolean).join(" - "),
		description: webResource.Type,
	};
}

function assemblyToQuickPick(assembly: AssemblyInfo): vscode.QuickPickItem & { info: AssemblyInfo } {
	return {
		info: assembly,
		label: assembly.Name,
	};
}

function pluginToQuickPick(plugIn: PluginInfo): vscode.QuickPickItem & { info: PluginInfo } {
	return {
		info: plugIn,
		label: plugIn.Name,
	};
}

function stepToQuickPick(step: StepInfo): vscode.QuickPickItem & { info: StepInfo } {
	return {
		info: step,
		label: step.Name,
		detail: [step.MessageName, step.EntityName, step.Stage].filter(Boolean).join(" - "),
	};
}

/**
 * Request a solution name from the user. If vscode.git is installed and enabled and
 * suggestSolutionNameBasedOnGitBranch is active, this will attempt to read the name of the current branch and apply
 * some string transformations. Throws an error if nothing is provided.
 */
export async function getSolutionName() {
	const gitSolutionName = Configuration.suggestSolutionNameBasedOnGitBranch
		? gitBranchNameToSolutionName(tryToGetGitBranchName())
		: undefined;
	const solutionName = await vscode.window.showInputBox({
		ignoreFocusOut: true,
		prompt: "Enter a name for the new solution.",
		value: gitSolutionName,
		validateInput: (val) => {
			return !val ? "The solution name must not be empty" : "";
		},
	});
	if (!solutionName) throw new Error("The solution name is mandatory");
	return solutionName;
}

/**
 * Request a version from the user. If suggestDateBasedSolutionVersions, it is injected as a placeholder.
 * If the user aborts via ESC this will always throw an error. This also throws an error if no version is supplied and
 * the date based version suggestion is inactive. Will also validate for SemVer notation.
 */
export async function getVersion() {
	const versionYear = new Date().getFullYear() % 100;
	const versionMonth = new Date().getMonth() + 1;
	const versionDay = new Date().getDate();
	const versionPlaceHolder =
		Configuration.suggestDateBasedSolutionVersions === true
			? [versionYear, versionMonth, versionDay].map((val) => val.toString().padStart(2, "0")).join(".")
			: undefined;
	let version = await vscode.window.showInputBox({
		ignoreFocusOut: true,
		prompt: "Enter a version number for the new solution.",
		placeHolder: versionPlaceHolder,
		validateInput: (val) => {
			if (!val) return null;
			const validator = new RegExp(/^(\d+\.){2,3}\d+$/);
			if (!validator.test(val)) return "Please enter a valid version string.";
			return null;
		},
	});
	if (version === "" && versionPlaceHolder) return versionPlaceHolder;
	if (!version) throw new Error("A version is required to create a solution");
	return version;
}

/**
 * Let the user choose the publisher for an extension. If a publisher has been selected for this instance and
 * organization before, this publisher will be selected. If nothing is selected, this will throw an error.
 * @param progress VS Code progress item
 * @param connectionState Cody Toolkit Core connection state
 * @param config Workspace memento proxy
 */
export async function getPublisher(
	progress: Progress,
	connectionState: ConnectionState,
	config: PreferredPublisherProxy
) {
	if (
		connectionState.activeOrganization == null ||
		!connectionState.activeOrganization.UniqueName ||
		!connectionState.activeInstance?.instanceId
	)
		throw new Error("No active organization");
	// Preferred publisher will be the one that has been used last for this combination of instance and organzation
	const preferredPublisherId = config.getPreferredPublisherId(
		connectionState.activeInstance.instanceId,
		connectionState.activeOrganization.UniqueName
	);
	progress.report({ message: "Retrieving Publishers" });
	const availablePublishers = retrievePublishers(connectionState.activeOrganization.UniqueName).then((response) => {
		progress.report({ message: "Awaiting User Input" });
		// Sort items such that the preferred publisher is on top of the list and the rest is sorted by name
		return response.data.map(publisherToQuickPick).sort((pubA, pubB) => {
			if (preferredPublisherId && pubA.info.Id == preferredPublisherId) {
				return -Infinity;
			}
			return pubA.label.localeCompare(pubB.label);
		});
	});
	const publisher = await vscode.window.showQuickPick(availablePublishers, {
		canPickMany: false,
		ignoreFocusOut: true,
		placeHolder: "Choose your publisher. Press ESC to cancel.",
	});
	if (publisher == null) throw new Error("The publisher is mandatory");
	config.setPreferredPublisher(
		connectionState.activeInstance.instanceId,
		connectionState.activeOrganization.UniqueName,
		publisher.info
	);
	return publisher.info;
}

/**
 * Prompts the user for a description for a solution. This is optional, so it will never throw an error either way.
 */
export async function getDescription() {
	const description = await vscode.window.showInputBox({
		prompt: "Enter a description. (optional)",
		ignoreFocusOut: true,
	});
	return description;
}

/**
 * Prompts the user to choose a solution from the solutions that exist in the CRM.
 * @param progress VS Code Progress item
 * @param activeOrganization The unique name of the currently active Dynamics CRM organization
 */
export async function chooseSolution(progress: Progress, activeOrganization: string) {
	progress.report({ message: "Loading Solutions" });
	const solutions = retrieveSolutions(activeOrganization).then((response) => {
		progress.report({ message: "Waiting for user input" });
		return response.data.map(solutionToQuickPick);
	});
	const chosenSolution = await vscode.window.showQuickPick(solutions, {
		canPickMany: false,
		ignoreFocusOut: true,
		matchOnDescription: true,
		matchOnDetail: false,
		placeHolder: "Choose the Solution that you want to add your components to.",
	});
	if (chosenSolution == null) throw new Error("No Solution selected");
	return chosenSolution.info;
}

/**
 * Prompts the user to choose a webresource from the existing webresource in the CRM.
 * @param progress VS Code Progress item
 * @param activeOrganization The unique name of the currently active Dynamics CRM organization
 */
export async function chooseWebResources(progress: Progress, activeOrganization: string) {
	progress.report({ message: "Loading WebResources" });
	const webResources = retrieveWebResources(activeOrganization).then((response) => {
		progress.report({ message: "Waiting for user input" });
		return response.data.map(webResourceToQuickPick);
	});
	const chosenWebResources = await vscode.window.showQuickPick(webResources, {
		canPickMany: true,
		ignoreFocusOut: true,
		matchOnDescription: false,
		matchOnDetail: true,
		placeHolder: "Choose the WebResources that you want to add to your solution.",
	});
	if (chosenWebResources == null) throw new Error("No WebResources selected");
	return chosenWebResources.map((wr) => wr.info);
}

/**
 * Prompts the user to choose an assembly from the existing assemblies in the CRM.
 * @param progress VS Code Progress item
 * @param activeOrganization The unique name of the currently active Dynamics CRM organization
 */
export async function chooseAssembly(progress: Progress, activeOrganization: string) {
	progress.report({ message: "Loading Assemblies" });
	const assemblies = retrieveAssemblies(activeOrganization).then((response) => {
		progress.report({ message: "Waiting for user input" });
		return response.data.map(assemblyToQuickPick);
	});
	const chosenAssembly = await vscode.window.showQuickPick(assemblies, {
		canPickMany: false,
		ignoreFocusOut: true,
		matchOnDescription: true,
		matchOnDetail: false,
		placeHolder: "Choose the Assembly that you want to add to your solution.",
	});
	if (chosenAssembly == null) throw new Error("No Assembly selected");
	return chosenAssembly.info;
}

/**
 * Prompts the user to choose a plugin from a set of plugins.
 * @param plugIns
 */
export async function choosePlugin(plugIns: PluginInfo[]) {
	const plugin = await vscode.window.showQuickPick(plugIns.map(pluginToQuickPick), {
		canPickMany: false,
		ignoreFocusOut: true,
		placeHolder: "Choose the plugin that includes the steps you want to add.",
	});
	return plugin?.info;
}

/**
 * Prompts the user to choose a step from a set of steps.
 * @param steps
 */
export async function chooseSteps(steps: StepInfo[]) {
	const chosenSteps = await vscode.window.showQuickPick(steps.map(stepToQuickPick), {
		canPickMany: true,
		ignoreFocusOut: true,
		placeHolder:
			"Choose the steps that you want to add to your solution. Steps from other plugins will be available after you made a selection.",
	});
	return chosenSteps?.map((step) => step.info);
}

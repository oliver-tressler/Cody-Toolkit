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

export type Progress = vscode.Progress<{ message: string }>;

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

export async function getSolutionName() {
	const solutionName = await vscode.window.showInputBox({
		ignoreFocusOut: true,
		prompt: "Enter a name for the new solution.",
		validateInput: (val) => {
			return !val ? "The solution name must not be empty" : "";
		},
	});
	if (!solutionName) throw new Error("The solution name is mandatory");
	return solutionName;
}

export async function getVersion() {
	const versionYear = new Date().getFullYear() % 100;
	const versionMonth = new Date().getMonth() + 1;
	const versionDay = new Date().getDate();
	const versionPlaceHolder = [versionYear, versionMonth, versionDay]
		.map((val) => val.toString().padStart(2, "0"))
		.join(".");
	let version = await vscode.window.showInputBox({
		ignoreFocusOut: true,
		prompt: "Enter a version number for the new solution.",
		placeHolder: versionPlaceHolder,
		validateInput: (val) => {
			if (!val) return null;
			const validator = new RegExp(/(\d+\.){2,3}\d+/);
			if (!validator.test(val)) return "Please enter a valid version string.";
			return null;
		},
	});
	if (!version) return versionPlaceHolder;
	return version;
}

export async function getPublisher(progress: Progress, activeOrganization: string) {
	progress.report({ message: "Retrieving Publishers" });
	const availablePublishers = retrievePublishers(activeOrganization).then((response) => {
		progress.report({ message: "Awaiting User Input" });
		return response.data.map(publisherToQuickPick);
	});
	const publisher = await vscode.window.showQuickPick(availablePublishers, {
		canPickMany: false,
		ignoreFocusOut: true,
		placeHolder: "Choose your publisher. Press ESC to cancel.",
	});
	if (publisher == null) throw new Error("The publisher is mandatory");
	return publisher.info;
}

export async function getDescription() {
	const description = await vscode.window.showInputBox({
		prompt: "Enter a description. (optional)",
		ignoreFocusOut: true,
	});
	return description;
}

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

export async function chooseWebResources(progress: Progress, activeOrganization: string) {
	progress.report({ message: "Loading WebResources" });
	const webResources = retrieveWebResources(activeOrganization).then((response) => {
		progress.report({ message: "Waiting for user input" });
		return response.data.map(webResourceToQuickPick);
	});
	const chosenWebResources = await vscode.window.showQuickPick(webResources, {
		canPickMany: true,
		ignoreFocusOut: true,
		matchOnDescription: true,
		matchOnDetail: false,
		placeHolder: "Choose the WebResources that you want to add to your solution.",
	});
	if (chosenWebResources == null) throw new Error("No WebResources selected");
	return chosenWebResources.map((wr) => wr.info);
}

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

export async function choosePlugin(plugIns: PluginInfo[]) {
	const plugin = await vscode.window.showQuickPick(plugIns.map(pluginToQuickPick), {
		canPickMany: false,
		ignoreFocusOut: true,
		placeHolder: "Choose the plugin that includes the steps you want to add.",
	});
	return plugin?.info;
}

export async function chooseSteps(steps: StepInfo[]) {
	const chosenSteps = await vscode.window.showQuickPick(steps.map(stepToQuickPick), {
		canPickMany: true,
		ignoreFocusOut: true,
		placeHolder:
			"Choose the steps that you want to add to your solution. Steps from other plugins will be available after you made a selection.",
	});
	return chosenSteps?.map((step) => step.info);
}

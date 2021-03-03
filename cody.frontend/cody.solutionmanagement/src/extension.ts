// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { AxiosError } from "axios";
import * as vscode from "vscode";
import {
	createSolution,
	PublisherInfo,
	retrievePublishers,
	retrieveSolutions,
	retrieveWebResources,
	SolutionInfo,
	WebResourceInfo,
	addWebResourceToSolution as addWebResourceToSolutionRequest,
	addAssemblyToSolution as addAssemblyToSolutionRequest,
	AssemblyInfo,
	retrieveAssemblies,
	retrieveAssemblySteps,
	addStepToSolution,
	PluginInfo,
	StepInfo,
} from "./Api/Api";

type Progress = vscode.Progress<{ message: string }>;

type BaseInstanceConfiguration = {
	instanceId: string;
	useCredentialsFile: boolean;
};

type ManualInstanceConfiguration = BaseInstanceConfiguration & {
	discoveryServiceUrl: string;
	userName: string;
	useCredentialsFile: false;
};

type CredentialsFileInstanceConfiguration = BaseInstanceConfiguration & {
	credentialsFilePath: string;
	useCredentialsFile: true;
};

type InstanceConfiguration = ManualInstanceConfiguration | CredentialsFileInstanceConfiguration;

type OrganizationConfiguration = {
	UniqueName: string;
	FriendlyName: string;
	UrlName: string;
	Url: string;
};

type ConnectionState = {
	activeInstance?: InstanceConfiguration & { authenticated: boolean };
	activeOrganization?: OrganizationConfiguration;
	availableOrganizations: OrganizationConfiguration[];

	connecting: boolean;
};

async function getActiveOrganization() {
	const connectionState = await vscode.commands.executeCommand<ConnectionState>(
		"cody.toolkit.core.getConnectionState"
	);
	if (connectionState?.activeInstance?.authenticated !== true || connectionState?.activeOrganization == null) {
		return undefined;
	}
	return connectionState.activeOrganization;
}

async function getSolutionName() {
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

async function getVersion() {
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

function publisherToQuickPick(publisher: PublisherInfo): vscode.QuickPickItem & { info: PublisherInfo } {
	return {
		label: publisher.Name,
		description: publisher.Description,
		detail: `${publisher.UniqueName} (Prefix: ${publisher.Prefix})`,
		info: publisher,
	};
}

async function getPublisher(progress: Progress, activeOrganization: OrganizationConfiguration) {
	progress.report({ message: "Retrieving Publishers" });
	const availablePublishers = retrievePublishers(activeOrganization.UniqueName).then((response) => {
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

async function getDescription() {
	const description = await vscode.window.showInputBox({
		prompt: "Enter a description. (optional)",
		ignoreFocusOut: true,
	});
	return description;
}

async function createNewSolution() {
	const activeOrganization = await getActiveOrganization();
	if (activeOrganization == null) {
		vscode.window.showErrorMessage("Not Authenticated");
		return;
	}
	vscode.window.withProgress(
		{ location: vscode.ProgressLocation.Notification, title: "Create Solution", cancellable: false },
		async (progress: Progress) => {
			progress.report({ message: "Awaiting User Input" });
			const solutionName = await getSolutionName();
			progress.report({ message: "Awaiting User Input" });
			const version = await getVersion();
			const publisher = await getPublisher(progress, activeOrganization);
			progress.report({ message: "Awaiting User Input" });
			const description = await getDescription();
			progress.report({ message: "Creating Solution ..." });
			const result = await createSolution(
				activeOrganization.UniqueName,
				solutionName,
				version,
				publisher,
				description
			);
			vscode.window.showInformationMessage(`Solution ${result.data.UniqueName} has been created.`);
		}
	);
}

function solutionToQuickPick(solution: SolutionInfo): vscode.QuickPickItem & { info: SolutionInfo } {
	return {
		info: solution,
		label: solution.Name + `(${solution.Publisher.Name})`,
		detail: solution.Description,
		description: solution.Version,
	};
}

async function chooseSolution(progress: Progress, activeOrganization: OrganizationConfiguration) {
	progress.report({ message: "Loading Solutions" });
	const solutions = retrieveSolutions(activeOrganization.UniqueName).then((response) => {
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

function webResourceToQuickPick(webResource: WebResourceInfo): vscode.QuickPickItem & { info: WebResourceInfo } {
	return {
		info: webResource,
		label: webResource.DisplayName ?? webResource.Name,
		detail: webResource.Description,
		description: webResource.Type,
	};
}

async function chooseWebResources(progress: Progress, activeOrganization: OrganizationConfiguration) {
	progress.report({ message: "Loading WebResources" });
	const webResources = retrieveWebResources(activeOrganization.UniqueName).then((response) => {
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

async function addWebResourceToSolution() {
	const activeOrganization = await getActiveOrganization();
	if (activeOrganization == null) {
		vscode.window.showErrorMessage("Not Authenticated");
		return;
	}
	await vscode.window.withProgress(
		{ location: vscode.ProgressLocation.Notification, title: "Add WebResource to Solution", cancellable: false },
		async (progress: Progress) => {
			const solution = await chooseSolution(progress, activeOrganization);
			const chosenWebResources = await chooseWebResources(progress, activeOrganization);
			for (const wr of chosenWebResources) {
				progress.report({ message: `Adding ${wr.Name} to solution ${solution.UniqueName}` });
				try {
					await addWebResourceToSolutionRequest(activeOrganization.UniqueName, solution.UniqueName, wr.Id);
				} catch (e) {
					vscode.window.showErrorMessage(
						`Unable to add WebResource ${wr.Name} to Solution ${solution.UniqueName} \
						${e.message}`
					);
				}
			}
		}
	);
}

function assemblyToQuickPick(assembly: AssemblyInfo): vscode.QuickPickItem & { info: AssemblyInfo } {
	return {
		info: assembly,
		label: assembly.Name,
	};
}

async function chooseAssembly(progress: Progress, activeOrganization: OrganizationConfiguration) {
	progress.report({ message: "Loading Assemblies" });
	const assemblies = retrieveAssemblies(activeOrganization.UniqueName).then((response) => {
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

function pluginToQuickPick(plugIn: PluginInfo): vscode.QuickPickItem & { info: PluginInfo } {
	return {
		info: plugIn,
		label: plugIn.Name,
	};
}

async function choosePlugin(plugIns: PluginInfo[]) {
	const plugin = await vscode.window.showQuickPick(plugIns.map(pluginToQuickPick), {
		canPickMany: false,
		ignoreFocusOut: true,
		placeHolder: "Choose the plugin that includes the steps you want to add.",
	});
	return plugin?.info;
}

function stepToQuickPick(step: StepInfo): vscode.QuickPickItem & { info: StepInfo } {
	return {
		info: step,
		label: step.Name,
		detail: [step.MessageName, step.EntityName, step.Stage].filter(Boolean).join(" - "),
	};
}

async function chooseSteps(steps: StepInfo[]) {
	const chosenSteps = await vscode.window.showQuickPick(steps.map(stepToQuickPick), {
		canPickMany: true,
		ignoreFocusOut: true,
		placeHolder:
			"Choose the steps that you want to add to your solution. Steps from other plugins will be available after you made a selection.",
	});
	return chosenSteps?.map((step) => step.info);
}

async function addStepsToSolution(
	progress: Progress,
	activeOrganization: OrganizationConfiguration,
	assembly: AssemblyInfo,
	solution: SolutionInfo
) {
	progress.report({ message: "Loading Steps" });
	const availablePluginsAndSteps = (
		await retrieveAssemblySteps(activeOrganization.UniqueName, assembly.Id, solution.Id)
	).data.filter((plugin) => plugin.Steps?.length > 0);
	if (availablePluginsAndSteps.length == 0) {
		vscode.window.showInformationMessage("No plugins found for assembly");
	}
	while (true) {
		progress.report({ message: "Waiting for user input" });
		const plugin = await choosePlugin(availablePluginsAndSteps);
		if (plugin == null) {
			return;
		}
		const steps = await chooseSteps(plugin.Steps);
		if (steps == null) {
			return;
		}
		const errors = [];
		for (const step of steps) {
			try {
				progress.report({ message: `Adding step ${step.Name} to solution ${solution.Name}` });
				await addStepToSolution(activeOrganization.UniqueName, solution.UniqueName, step.Id);
			} catch (e) {
				vscode.window.showErrorMessage(`Unable to add step ${step.Name} to solution ${solution.Name}`);
			}
		}
	}
}

async function addAssemblyToSolution() {
	const activeOrganization = await getActiveOrganization();
	if (activeOrganization == null) {
		vscode.window.showErrorMessage("Not Authenticated");
		return;
	}
	await vscode.window.withProgress(
		{ location: vscode.ProgressLocation.Notification, title: "Add WebResource to Solution", cancellable: false },
		async (progress: Progress) => {
			const solution = await chooseSolution(progress, activeOrganization);
			const assembly = await chooseAssembly(progress, activeOrganization);
			progress.report({ message: `Adding ${assembly.Name} to solution ${solution.Name}` });
			try {
				await addAssemblyToSolutionRequest(activeOrganization.UniqueName, solution.UniqueName, assembly.Id);
			} catch (e) {
				vscode.window.showErrorMessage((e as AxiosError).response?.data.Message ?? e.message);
				return;
			}
			progress.report({ message: "Awaiting User Input" });
			const result = await vscode.window.showQuickPick(["Yes", "No"], {
				canPickMany: false,
				placeHolder: "Do you want to add steps from this assembly as well?",
			});
			if (result != "Yes") return;
			await addStepsToSolution(progress, activeOrganization, assembly, solution);
		}
	);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate({ subscriptions }: vscode.ExtensionContext) {
	const addAssemblyToSolutionCommand = vscode.commands.registerCommand(
		"cody.toolkit.solutionmanager.addassemblytosolution",
		addAssemblyToSolution
	);
	const addWebResourceToSolutionCommand = vscode.commands.registerCommand(
		"cody.toolkit.solutionmanager.addwebresourcetosolution",
		addWebResourceToSolution
	);
	const createSolutionCommand = vscode.commands.registerCommand(
		"cody.toolkit.solutionmanager.createnewsolution",
		createNewSolution
	);
	subscriptions.push(addAssemblyToSolutionCommand, addWebResourceToSolutionCommand, createSolutionCommand);
}

// this method is called when your extension is deactivated
export function deactivate() {}

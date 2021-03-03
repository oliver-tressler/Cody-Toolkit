import { AxiosError } from "axios";
import * as vscode from "vscode";
import {
	addStepToSolution,
	AssemblyInfo,
	retrieveAssemblySteps,
	addAssemblyToSolution as addAssemblyToSolutionRequest,
	SolutionInfo,
} from "./Api/Api";
import { chooseAssembly, choosePlugin, chooseSolution, chooseSteps, Progress } from "./Utils/userInteraction";
import { getActiveOrganization } from "./Utils/connection";
async function addStepsToSolution(
	progress: Progress,
	activeOrganization: string,
	assembly: AssemblyInfo,
	solution: SolutionInfo
) {
	progress.report({ message: "Loading Steps" });
	const availablePluginsAndSteps = (
		await retrieveAssemblySteps(activeOrganization, assembly.Id, solution.Id)
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
				await addStepToSolution(activeOrganization, solution.UniqueName, step.Id);
			} catch (e) {
				vscode.window.showErrorMessage(`Unable to add step ${step.Name} to solution ${solution.Name}`);
			}
		}
	}
}

export async function addAssemblyToSolution() {
	const activeOrganization = await getActiveOrganization();
	if (activeOrganization == null) {
		vscode.window.showErrorMessage("Not Authenticated");
		return;
	}
	await vscode.window.withProgress(
		{ location: vscode.ProgressLocation.Notification, title: "Add WebResource to Solution", cancellable: false },
		async (progress: Progress) => {
			const solution = await chooseSolution(progress, activeOrganization.UniqueName);
			const assembly = await chooseAssembly(progress, activeOrganization.UniqueName);
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
			await addStepsToSolution(progress, activeOrganization.UniqueName, assembly, solution);
		}
	);
}

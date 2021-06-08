import * as vscode from "vscode";
import { addAssemblyToSolution } from "./addAssemblyOrStepsToSolution";
import { addWebResourceToSolution } from "./addWebResourceToSolution";
import { createNewSolution } from "./createSolution";
import { exportSolution } from "./exportSolution";

export function activate(context: vscode.ExtensionContext) {
	const addAssemblyToSolutionCommand = vscode.commands.registerCommand(
		"cody.toolkit.solutionmanagement.addassemblytosolution",
		addAssemblyToSolution
	);
	const addWebResourceToSolutionCommand = vscode.commands.registerCommand(
		"cody.toolkit.solutionmanagement.addwebresourcetosolution",
		addWebResourceToSolution
	);
	const createSolutionCommand = vscode.commands.registerCommand(
		"cody.toolkit.solutionmanagement.createnewsolution",
		// Pass context to provide access to localstorage memento object.
		// This allows caching the last used publisher.
		() => createNewSolution(context)
	);
	const exportSolutionCommand = vscode.commands.registerCommand(
		"cody.toolkit.solutionmanagement.exportsolution",
		() => exportSolution()
	)
	context.subscriptions.push(addAssemblyToSolutionCommand, addWebResourceToSolutionCommand, createSolutionCommand);
}

// this method is called when your extension is deactivated
export function deactivate() {}

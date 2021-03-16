import * as vscode from "vscode";
import { addAssemblyToSolution } from "./addAssemblyOrStepsToSolution";
import { addWebResourceToSolution } from "./addWebResourceToSolution";
import { createNewSolution } from "./createSolution";

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
	context.subscriptions.push(addAssemblyToSolutionCommand, addWebResourceToSolutionCommand, createSolutionCommand);
}

// this method is called when your extension is deactivated
export function deactivate() {}

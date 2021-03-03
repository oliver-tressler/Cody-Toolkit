import * as vscode from "vscode";
import { addAssemblyToSolution } from "./addAssemblyOrStepsToSolution";
import { addWebResourceToSolution } from "./addWebResourceToSolution";
import { createNewSolution } from "./createSolution";

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

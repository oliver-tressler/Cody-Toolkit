import * as vscode from "vscode";
import * as path from "path";
import * as ts from "typescript";
import * as fs from "fs";
import { CustomBuildTaskTerminal } from "./Console";
import { getBuildInfo } from "./build";

/**
 * Check if a given dir is equal to or a subdirectory of another dir
 * @param parent fsPath (dir)
 * @param child fsPath (dir)
 */
function isSubDirOrEqualDir(parent: string, child: string) {
	const parentPath = path.parse(parent);
	const childPath = path.parse(child);
	if (parentPath.dir === childPath.dir) {
		return true;
	}
	const rel = path.relative(parent, child);
	return rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function requiresBuild(fileExtension: string) {
	const extensionsRequiringBuild = [".js", ".ts"];
	return extensionsRequiringBuild.some((ext) => ext === fileExtension.toLocaleLowerCase());
}

function getWorkspaceForActiveEditor(file: string) {
	return vscode.workspace.workspaceFolders?.find((wf) => isSubDirOrEqualDir(wf.uri.fsPath, file));
}

type TaskDefinition = {
	title: string;
	build: boolean;
	publish: boolean;
} & vscode.TaskDefinition;

const taskDefinitions: TaskDefinition[] = [
	{ build: true, publish: false, type: "Cody Toolkit", title: "Build" },
	{ build: true, publish: true, type: "Cody Toolkit", title: "Build and Publish" },
	{ build: false, publish: true, type: "Cody Toolkit", title: "Publish" },
];

function buildTaskExecutorFactory(definition: TaskDefinition, filePath: string) {}

function taskDefinitionToTask(
	context: vscode.ExtensionContext,
	definition: TaskDefinition,
	workspace: vscode.WorkspaceFolder,
	filePath: string
): vscode.Task {
	return {
		definition: definition,
		scope: vscode.TaskScope.Workspace,
		group: vscode.TaskGroup.Build,
		name: definition.title,
		source: "Cody Toolkit",
		problemMatchers: ["$tsc"],
		presentationOptions: {
			showReuseMessage: false,
			clear: true,
			focus: false,
			panel: vscode.TaskPanelKind.New,
			reveal: vscode.TaskRevealKind.Silent,
		},
		runOptions: {},
		isBackground: false,
		execution: new vscode.CustomExecution(async () => {
			return new CustomBuildTaskTerminal(async () => {
				getBuildInfo(filePath, context.workspaceState);
			});
		}),
	};
}

export function activate(context: vscode.ExtensionContext) {
	const buildTaskProvider = vscode.tasks.registerTaskProvider("Cody Tookit", {
		resolveTask: () => undefined,
		provideTasks: () => {
			const file = vscode.window.activeTextEditor?.document.fileName;
			if (file == null) {
				throw new Error("No active editor");
			}
			const parsedFile = path.parse(file);
			const workspace = getWorkspaceForActiveEditor(file);
			if (workspace == null) {
				throw new Error("Unable to resolve workspace");
			}
			const fileRequiresBuilding = requiresBuild(parsedFile.ext);
			return taskDefinitions
				.filter((t) => t.build == fileRequiresBuilding)
				.map<vscode.Task>((def) => taskDefinitionToTask(context, def, workspace, file));
		},
	});
	context.subscriptions.push(buildTaskProvider);
}

// this method is called when your extension is deactivated
export function deactivate() {}

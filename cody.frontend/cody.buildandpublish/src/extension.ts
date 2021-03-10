import * as path from "path";
import * as vscode from "vscode";
import { build, getBuildInfo } from "./build";
import { Configuration } from "./Configuration/ConfigurationProxy";
import { CustomBuildTaskTerminal } from "./Console";
import { generateFiddlerRule } from "./generateFiddlerRules";

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
			reveal: vscode.TaskRevealKind.Never,
		},
		runOptions: {},
		isBackground: false,
		execution: new vscode.CustomExecution(async () => {
			await vscode.window.withProgress({location: vscode.ProgressLocation.Notification, cancellable: false, title: "Build & Publish"}, async (progress) => {
				progress.report({message: "Gathering Build Info ..."});
				const buildInfo = await getBuildInfo(filePath, context.workspaceState, definition);
				progress.report({message: "Building ..."});
				await build(buildInfo)
				if (Configuration.createFiddlerRulesWhenBuildingScripts) {
					progress.report({ message: "Generating Fiddler File ..." });
					generateFiddlerRule(buildInfo);
				}
				vscode.window.showInformationMessage("Building complete");
			})
			const terminal = new CustomBuildTaskTerminal(async () => {
			});
			terminal.close();
			return terminal;
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
				.map<vscode.Task>((def) => taskDefinitionToTask(context, def, workspace, path.normalize(file)));
		},
	});
	context.subscriptions.push(buildTaskProvider);
}

// this method is called when your extension is deactivated
export function deactivate() {}

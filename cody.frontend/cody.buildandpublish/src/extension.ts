import * as path from "path";
import * as vscode from "vscode";
import { build, getBuildInfo } from "./build";
import { CustomBuildTaskTerminal } from "./Utils/console";
import { getPublishInfo, publish } from "./publish";
import { getWorkspaceForActiveEditor } from "./Utils/fsUtils";

function requiresBuild(filePath: string) {
	const extension = path.parse(filePath).ext;
	if (extension == ".ts") return true;
	if (extension == ".js") return undefined;
	else return false;
}

type TaskDefinition = {
	title: string;
	build: boolean;
	publish: boolean;
} & vscode.TaskDefinition;

const taskDefinitions: TaskDefinition[] = [
	{ build: true, publish: false, type: "build", title: "Build" },
	{ build: true, publish: true, type: "buildpublish", title: "Build and Publish" },
	{ build: false, publish: true, type: "publish", title: "Publish" },
];

function buildTaskExecutorFactory(definition: TaskDefinition, filePath: string) {
	if (definition.build && definition.publish) {
		return async (localStorage: vscode.Memento) => {
			await getBuildInfo(filePath, localStorage, definition).then(build).then(publish);
		};
	}
	if (definition.build) {
		return async (localStorage: vscode.Memento) => {
			await getBuildInfo(filePath, localStorage, definition).then(build);
		};
	}
	if (definition.publish) {
		return async (localStorage: vscode.Memento) => {
			await getPublishInfo(filePath, localStorage).then(publish);
		};
	}
	return async () => {};
}

function taskDefinitionToTask(
	context: vscode.ExtensionContext,
	definition: TaskDefinition,
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
			const task = buildTaskExecutorFactory(definition, filePath);
			const terminal = new CustomBuildTaskTerminal(async () => {
				await task(context.workspaceState);
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
			const workspace = getWorkspaceForActiveEditor(file);
			if (workspace == null) {
				throw new Error("Unable to resolve workspace");
			}
			const fileRequiresBuilding = requiresBuild(file);
			return taskDefinitions
				.filter((t) => fileRequiresBuilding === undefined || t.build == fileRequiresBuilding)
				.map<vscode.Task>((def) => taskDefinitionToTask(context, def, path.normalize(file)));
		},
	});
	context.subscriptions.push(buildTaskProvider);
}

// this method is called when your extension is deactivated
export function deactivate() {}

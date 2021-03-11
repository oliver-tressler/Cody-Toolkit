import * as path from "path";
import * as vscode from "vscode";
import { build, getBuildInfo } from "./build";
import { CustomBuildTaskTerminal } from "./Utils/console";
import { getPublishInfo, publish } from "./publish";
import { getWorkspaceForActiveEditor } from "./Utils/fsUtils";

const acceptedExtensions = [".ts", ".js", ".html", ".css"];
function acceptedExtension(filePath: string) {
	const filePathExtension = path.parse(filePath).ext.toLocaleLowerCase();
	return acceptedExtensions.some((ext) => filePathExtension === ext);
}

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
	{ build: true, publish: false, type: "cody.toolkit.buildtasks.build", title: "Build" },
	{ build: true, publish: true, type: "cody.toolkit.buildtasks.buildpublish", title: "Build & Publish" },
	{ build: false, publish: true, type: "cody.toolkit.buildtasks.publish", title: "Publish" },
];

function buildTaskExecutorFactory(definition: TaskDefinition, filePath: string) {
	if (definition.build && definition.publish) {
		return (localStorage: vscode.Memento) =>
			getBuildInfo(filePath, localStorage, definition).then(build).then(publish);
	}
	if (definition.build) {
		return (localStorage: vscode.Memento) => getBuildInfo(filePath, localStorage, definition).then(build);
	}
	if (definition.publish) {
		return (localStorage: vscode.Memento) => getPublishInfo(filePath, localStorage).then(publish);
	}
	return () => Promise.resolve();
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
	const supportedBuildExtensions = [".ts", ".js"];
	vscode.commands.executeCommand("setContext", "cody:supportedBuildExtensions", supportedBuildExtensions);
	vscode.commands.executeCommand("setContext", "cody:supportedBuildPublishExtensions", supportedBuildExtensions);
	const supportedPublishExtensions = [".js", ".html", ".css", ".png", ".jpg", ".gif", ".ico"];
	vscode.commands.executeCommand("setContext", "cody:supportedPublishExtensions", supportedPublishExtensions);
	const taskProvider = (def: TaskDefinition): vscode.TaskProvider<vscode.Task> => ({
		resolveTask: () => undefined,
		provideTasks: async () => {
			const file = vscode.window.activeTextEditor?.document.fileName;
			if (file == null) {
				throw new Error("No active editor");
			}
			const workspace = getWorkspaceForActiveEditor(file);
			if (workspace == null) {
				throw new Error("Unable to resolve workspace");
			}
			const fileRequiresBuilding = requiresBuild(file);
			if (acceptedExtension(file) && fileRequiresBuilding !== false && def.build)
				return [taskDefinitionToTask(context, def, file)];
			if (acceptedExtension(file) && fileRequiresBuilding !== true && def.publish)
				return [taskDefinitionToTask(context, def, file)];
			return undefined;
		},
	});
	const buildTaskProvider = vscode.tasks.registerTaskProvider(
		"cody.toolkit.buildtasks.build",
		taskProvider(taskDefinitions[0])
	);
	const buildPublishTaskProvider = vscode.tasks.registerTaskProvider(
		"cody.toolkit.buildtasks.buildpublish",
		taskProvider(taskDefinitions[1])
	);
	const publishTaskProvider = vscode.tasks.registerTaskProvider(
		"cody.toolkit.buildtasks.publish",
		taskProvider(taskDefinitions[2])
	);

	const buildCommand = vscode.commands.registerCommand("cody.toolkit.buildandpublish.build", async (arg) => {
		vscode.window.withProgress(
			{ location: vscode.ProgressLocation.Window, title: "Building...", cancellable: false },
			async () => {
				await buildTaskExecutorFactory(taskDefinitions[0], arg.fsPath)(context.workspaceState);
			}
		);
	});
	const buildPublishCommand = vscode.commands.registerCommand(
		"cody.toolkit.buildandpublish.buildpublish",
		async (arg) => {
			vscode.window.withProgress(
				{ location: vscode.ProgressLocation.Window, title: "Building...", cancellable: false },
				async () => {
					await buildTaskExecutorFactory(taskDefinitions[1], arg.fsPath)(context.workspaceState);
				}
			);
		}
	);
	const publishCommand = vscode.commands.registerCommand("cody.toolkit.buildandpublish.publish", async (arg) => {
		buildTaskExecutorFactory(taskDefinitions[2], arg.fsPath)(context.workspaceState);
		vscode.window.withProgress(
			{ location: vscode.ProgressLocation.Window, title: "Publishing...", cancellable: false },
			async () => {
				await buildTaskExecutorFactory(taskDefinitions[2], arg.fsPath)(context.workspaceState);
			}
		);
	});

	context.subscriptions.push(
		buildTaskProvider,
		buildPublishTaskProvider,
		publishTaskProvider,
		buildCommand,
		buildPublishCommand,
		publishCommand
	);
}

// this method is called when your extension is deactivated
export function deactivate() {}

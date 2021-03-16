import * as path from "path";
import * as vscode from "vscode";
import { build, getBuildInfo } from "./build";
import { CustomBuildTaskTerminal } from "./Utils/console";
import { getPublishInfo, publish } from "./publish";
import axios, { AxiosError } from "axios";
import { BuildAndPublishFileConfigurationProxy } from "./Configuration/MementoProxy";
import { getDirs, isSubDirOrEqualDir } from "./Utils/fsUtils";

const acceptedExtensions = [".ts", ".js", ".html", ".css"];
function acceptedExtension(filePath: string) {
	const filePathExtension = path.parse(filePath).ext.toLocaleLowerCase();
	return acceptedExtensions.some((ext) => filePathExtension === ext);
}

/**
 * Determines if a file requires buid. For .js files, we can't be sure.
 */
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

const taskDefinitions = {
	build: { build: true, publish: false, type: "cody.toolkit.buildtasks.build", title: "Build" } as TaskDefinition,
	buildpublish: {
		build: true,
		publish: true,
		type: "cody.toolkit.buildtasks.buildpublish",
		title: "Build & Publish",
	} as TaskDefinition,
	publish: {
		build: false,
		publish: true,
		type: "cody.toolkit.buildtasks.publish",
		title: "Publish",
	} as TaskDefinition,
};

/**
 * For a given file and task definition, this will chain the required steps to fulfill the task. Also attaches
 * an error handler. Returns an execution ready curried function that executes the steps.
 */
function buildTaskExecutorFactory(definition: TaskDefinition, filePath: string, localStorage: vscode.Memento) {
	if (definition.build && definition.publish) {
		return () => getBuildInfo(filePath, localStorage, definition).then(build).then(publish).catch(errorHandler);
	}
	if (definition.build) {
		return () => getBuildInfo(filePath, localStorage, definition).then(build).catch(errorHandler);
	}
	if (definition.publish) {
		return () => getPublishInfo(filePath, localStorage).then(publish).catch(errorHandler);
	}
	return () => Promise.resolve();
}

/**
 * Takes a task definition and returns an execution ready build task. This mostly sets metadata. Actual execution path is determined in buildTaskExecutorFactory.
 */
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
			clear: true,
			showReuseMessage: false,
			focus: false,
			echo: false,
			panel: vscode.TaskPanelKind.New,
		},
		runOptions: {},
		isBackground: false,
		execution: new vscode.CustomExecution(async () => {
			const task = buildTaskExecutorFactory(definition, filePath, context.workspaceState);
			const terminal = new CustomBuildTaskTerminal(() => task());
			terminal.close();
			return terminal;
		}),
	};
}

/**
 * Basic pass through error handler that tries to provide Server and Extension exception messages to the user
 * @param e Exception
 */
function errorHandler(e: any) {
	let errText: string | undefined = undefined;
	if (axios.isAxiosError(e)) {
		const axiErr: AxiosError<{ Message: string; ExceptionMessage?: string }> = e;
		if (axiErr.response?.data.ExceptionMessage || axiErr.response?.data.Message) {
			errText = axiErr.response.data.ExceptionMessage ?? axiErr.response.data.Message;
		}
	}
	if (!errText && "message" in e && typeof e.message === "string") {
		errText = e.message;
	}
	if (errText) {
		console.error(e);
		vscode.window.showErrorMessage(errText);
	}
	throw e;
}

export function activate(context: vscode.ExtensionContext) {
	// Set build-eligible file extensions for when clauses
	const supportedBuildExtensions = [".ts", ".js"];
	vscode.commands.executeCommand("setContext", "cody:supportedBuildExtensions", supportedBuildExtensions);
	vscode.commands.executeCommand("setContext", "cody:supportedBuildPublishExtensions", supportedBuildExtensions);
	// Set publish-eligible file extensions for when clauses
	const supportedPublishExtensions = [".js", ".html", ".css", ".png", ".jpg", ".gif", ".ico"];
	vscode.commands.executeCommand("setContext", "cody:supportedPublishExtensions", supportedPublishExtensions);

	// Generic task provider, will return a vscode Build Task for build, buildpublish or publish depending on
	// the current cwd (is srcDir), the currently opened file and the file extension.
	const taskProvider = (def: TaskDefinition): vscode.TaskProvider<vscode.Task> => ({
		resolveTask: () => undefined,
		provideTasks: async () => {
			const file = vscode.window.activeTextEditor?.document.fileName;
			if (file == null) {
				throw new Error("No active editor");
			}
			const workspace = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(file));
			if (workspace == null) {
				throw new Error("Unable to resolve workspace");
			}
			const dirs = getDirs(file);
			// Allow building only from within src folder specified in tsconfig
			const withinSrcFolder = dirs?.srcDir != null && isSubDirOrEqualDir(dirs.srcDir, file);
			const fileRequiresBuilding = requiresBuild(file);
			if (acceptedExtension(file) && fileRequiresBuilding !== false && withinSrcFolder && def.build)
				return [taskDefinitionToTask(context, def, file)];
			if (acceptedExtension(file) && fileRequiresBuilding !== true && def.publish)
				return [taskDefinitionToTask(context, def, file)];
			return undefined;
		},
	});
	// Individual build task providers for build, buildpublish and publish. VS Code was detecting duplicates or unexpected tasks otherwise.
	const buildTaskProvider = vscode.tasks.registerTaskProvider(
		"cody.toolkit.buildtasks.build",
		taskProvider(taskDefinitions.build)
	);
	const buildPublishTaskProvider = vscode.tasks.registerTaskProvider(
		"cody.toolkit.buildtasks.buildpublish",
		taskProvider(taskDefinitions.buildpublish)
	);
	const publishTaskProvider = vscode.tasks.registerTaskProvider(
		"cody.toolkit.buildtasks.publish",
		taskProvider(taskDefinitions.publish)
	);

	// Register commands for explorer context menu
	const buildCommand = vscode.commands.registerCommand("cody.toolkit.buildandpublish.build", async (arg) => {
		vscode.window.withProgress(
			{ location: vscode.ProgressLocation.Window, title: "Building...", cancellable: false },
			async () => {
				await buildTaskExecutorFactory(taskDefinitions.build, arg.fsPath, context.workspaceState)();
			}
		);
	});
	const buildPublishCommand = vscode.commands.registerCommand(
		"cody.toolkit.buildandpublish.buildpublish",
		async (arg) => {
			vscode.window.withProgress(
				{ location: vscode.ProgressLocation.Window, title: "Building...", cancellable: false },
				async () => {
					await buildTaskExecutorFactory(taskDefinitions.buildpublish, arg.fsPath, context.workspaceState)();
				}
			);
		}
	);
	const publishCommand = vscode.commands.registerCommand("cody.toolkit.buildandpublish.publish", async (arg) => {
		vscode.window.withProgress(
			{ location: vscode.ProgressLocation.Window, title: "Publishing...", cancellable: false },
			async () => {
				await buildTaskExecutorFactory(taskDefinitions.publish, arg.fsPath, context.workspaceState)();
			}
		);
	});

	// Add command to delete a stored configuration
	const removeFileConfiguration = vscode.commands.registerCommand(
		"cody.toolkit.buildandpublish.removeBuildFileConfiguration",
		async () => {
			const config = new BuildAndPublishFileConfigurationProxy(context.workspaceState);
			const filePath = await vscode.window.showInputBox({
				ignoreFocusOut: true,
				prompt: "Please enter the filepath to the file for which you want to remove the configuration",
				value: vscode.window.activeTextEditor?.document?.fileName,
			});
			if (!filePath) return;
			config.setFileConfiguration(filePath, undefined);
		}
	);

	context.subscriptions.push(
		buildTaskProvider,
		buildPublishTaskProvider,
		publishTaskProvider,
		buildCommand,
		buildPublishCommand,
		publishCommand,
		removeFileConfiguration
	);
}

// this method is called when your extension is deactivated
export function deactivate() {}

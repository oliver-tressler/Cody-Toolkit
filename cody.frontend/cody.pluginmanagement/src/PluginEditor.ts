import * as fs from "fs";
import * as path from "path";
import { v4 } from "uuid";
import * as vscode from "vscode";
import { Api } from "./Api";
import { PluginBrowserConfiguration } from "./Configuration/ConfigurationProxy";
import { Assembly, Image, Organization, Plugin, Step, TreeData } from "./PluginTreeDataProvider";
import { withAuthentication } from "./Utils/connection";
import { WebviewInterface } from "./WebviewExtensionInterface";
export class EditorProvider {
	async run(
		data: TreeData,
		mode: "add" | "edit",
		progress: vscode.Progress<{ message: string }>,
		context: vscode.ExtensionContext,
		existingPanel?: vscode.WebviewPanel
	): Promise<{ panelId: string; panel: vscode.WebviewPanel; webviewInterface: WebviewInterface }> {
		try {
			const factory = new EditorFactory();
			const editor = factory.getEditor(context, data, mode);
			progress.report({ message: "Fetching Data" });
			const item = await (mode === "add" ? editor.getDetailsCreate(data) : editor.getDetailsUpdate(data));
			progress.report({ message: "Generating Editor" });
			const panelId = editor.getPanelId(item) ?? v4();
			const panelName = editor.getPanelName(item);
			const panel =
				existingPanel ??
				vscode.window.createWebviewPanel(
					panelId,
					panelName,
					vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One,
					{
						enableScripts: true,
						localResourceRoots: [
							vscode.Uri.file(path.join(context.extensionPath, "dist", "static", "CSS")),
							vscode.Uri.file(path.join(context.extensionPath, "dist", "static", "JS")),
							vscode.Uri.file(path.join(context.extensionPath, "assets")),
						],
					}
				);
			const webviewInterface = new WebviewInterface(panel);
			panel.iconPath = editor.iconPath;
			if (existingPanel != null) {
				panel.reveal(vscode.ViewColumn.One, false);
			}

			progress.report({ message: "Generating Editor" });
			const htmlPath = editor.htmlPath;
			const script = panel.webview.asWebviewUri(editor.scriptPath);
			const style = panel.webview.asWebviewUri(
				vscode.Uri.file(path.join(context.extensionPath, "dist", "static", "CSS", "style.css"))
			);
			const icon = panel.webview.asWebviewUri(editor.iconPath);
			const content = fs
				.readFileSync(htmlPath.fsPath, "utf8")
				.replace("{{style}}", style.toString())
				.replace("{{script}}", script.toString())
				.replace("{{imageicon}}", icon.toString());

			panel.webview.html = content;
			if (mode === "add") {
				editor.renderCreate(webviewInterface, item);
			} else {
				editor.renderUpdate(webviewInterface, item);
			}

			return { panelId, panel, webviewInterface };
		} catch (e) {
			vscode.window.showErrorMessage(e.response?.data?.Message ?? e.message ?? "Unable to edit this element");
			throw e;
		}
	}
}

class EditorFactory {
	getEditor(
		context: vscode.ExtensionContext,
		data: TreeData,
		mode: "add" | "edit"
	): IEditor<any, TreeData, TreeData> {
		if (mode === "add" && data.contextValue) {
			if (data.contextValue.indexOf("step") >= 0) {
				return new ImageEditor(context);
			}
			if (data.contextValue.indexOf("plugin") >= 0) {
				return new StepEditor(context);
			}
			if (data.contextValue.indexOf("organization") >= 0) {
				return new AssemblyEditor(context);
			}
		}
		if (mode === "edit" && data.contextValue) {
			if (data.contextValue.indexOf("image") >= 0) {
				return new ImageEditor(context);
			}
			if (data.contextValue.indexOf("step") >= 0) {
				return new StepEditor(context);
			}
			if (data.contextValue.indexOf("assembly") >= 0) {
				return new AssemblyEditor(context);
			}
		}
		throw new Error("Unknown context value");
	}
}

interface IEditor<I, T, P> {
	iconPath: vscode.Uri;
	htmlPath: vscode.Uri;
	scriptPath: vscode.Uri;
	getPanelId(item: I): string;
	getPanelName(item: I): string;
	getDetailsCreate(data: P): I | Promise<I | undefined>;
	getDetailsUpdate(data: T): I | Promise<I>;
	renderCreate(webviewInterface: WebviewInterface, item: I): void;
	renderUpdate(webviewInterface: WebviewInterface, item: I): void;
}

type ImageItem = {
	Id: string;
	Name: string;
	EntityAlias: string;
	AvailablePre: boolean;
	AvailablePost: boolean;
	IsPre: boolean;
	IsPost: boolean;
	ImageAttributes: {
		LogicalName: string;
		DisplayName: string;
		Available: boolean;
	}[];
};

class ImageEditor implements IEditor<ImageItem, Image, Step> {
	iconPath: vscode.Uri;
	htmlPath: vscode.Uri;
	scriptPath: vscode.Uri;
	constructor(context: vscode.ExtensionContext) {
		this.iconPath = vscode.Uri.file(path.join(context.extensionPath, "assets", "image.svg"));
		this.htmlPath = vscode.Uri.file(path.join(context.extensionPath, "dist", "static", "HTML", "image-form.html"));
		this.scriptPath = vscode.Uri.file(path.join(context.extensionPath, "dist", "static", "JS", "image_script.js"));
	}

	getPanelId(item: ImageItem): string {
		return item?.Id ?? v4();
	}
	getPanelName(item: ImageItem): string {
		return item?.Name ?? "New Image";
	}
	async getDetailsUpdate(data: Image): Promise<ImageItem> {
		return (
			await Api.retrieveImageDetails(
				data.step.plugin.assembly.organization.id,
				data.id.replace("POST", "").replace("PRE", "")
			)
		)?.data as ImageItem;
	}
	async getDetailsCreate(data: Step): Promise<ImageItem> {
		return await withAuthentication(async ({ activeOrganization }) => {
			const imageData = (await Api.retrieveImageAbilities(activeOrganization.UniqueName, data.id)).data;
			if (!imageData.AvailablePre && !imageData.AvailablePost) {
				throw new Error("Images are not available for this plugin step.");
			}
			return imageData;
		});
	}

	renderUpdate(webviewInterface: WebviewInterface, item: ImageItem): void {
		webviewInterface.sendMessage("image_renderUpdate", item);
	}

	renderCreate(webviewInterface: WebviewInterface, item: ImageItem): void {
		webviewInterface.sendMessage("image_renderCreate", item);
	}
}

type StepItem = {
	Id: string;
	Name: string;
	MessageName: string;
	MessageId: string;
	EntityName: string;
	Stage: number;
	ExecutionOrder: number;
	UserId: string;
	IsDeployedOnServer: boolean;
	IsDeployedOffline: boolean;
	IsAsync: boolean;
	StepAttributes: {
		LogicalName: string;
		DisplayName: string;
		Available: boolean;
	}[];
};

class StepEditor implements IEditor<StepItem, Step, Plugin> {
	iconPath: vscode.Uri;
	htmlPath: vscode.Uri;
	scriptPath: vscode.Uri;
	private messages: { MessageName: string; MessageId: string }[];
	private entities: { DisplayName: string; LogicalName: string }[];
	private users: { UserName: string; UserId: string }[];
	constructor(context: vscode.ExtensionContext) {
		this.messages = [];
		this.entities = [];
		this.users = [];
		this.iconPath = vscode.Uri.file(path.join(context.extensionPath, "assets", "step.svg"));
		this.htmlPath = vscode.Uri.file(path.join(context.extensionPath, "dist", "static", "HTML", "step-form.html"));
		this.scriptPath = vscode.Uri.file(path.join(context.extensionPath, "dist", "static", "JS", "step_script.js"));
	}

	getPanelId(item: StepItem): string {
		return item?.Id ?? v4();
	}
	getPanelName(item: StepItem): string {
		return item?.Name ?? "New Step";
	}
	async getDetailsUpdate(data: Step): Promise<StepItem> {
		const step = (await Api.retrieveStepDetails(data.plugin.assembly.organization.id, data.id))?.data as StepItem;
		const messageReq = await Api.retrieveMessages(data.plugin.assembly.organization.id);
		const entityReq = await Api.retrieveEntities(data.plugin.assembly.organization.id, step.MessageId);
		const userReq = await Api.retrieveUsers(data.plugin.assembly.organization.id);

		this.messages = messageReq.data;
		this.entities = entityReq.data;
		this.users = userReq.data;
		return step;
	}

	async getDetailsCreate(data: Plugin) {
		const messageReq = await Api.retrieveMessages(data.assembly.organization.id);
		const entityReq = await Api.retrieveEntities(data.assembly.organization.id);
		const userReq = await Api.retrieveUsers(data.assembly.organization.id);
		this.messages = messageReq.data;
		this.entities = entityReq.data;
		this.users = userReq.data;
		return undefined;
	}

	renderUpdate(webviewInterface: WebviewInterface, item: StepItem): void {
		webviewInterface.sendMessage("step_renderUpdate", {
			item,
			messages: this.messages,
			entities: this.entities,
			users: this.users,
		});
	}

	renderCreate(webviewInterface: WebviewInterface) {
		webviewInterface.sendMessage("step_renderCreate", {
			messages: this.messages,
			users: this.users,
		});
	}
}

type AssemblyItem = {
	Id: string;
	Name: string;
	IsSandboxed: boolean;
	DeploymentMode: number;
	FilePath: string;
	Metadata: {
		Version: string;
		Culture: string;
		AssemblyName: string;
		PublicKeyToken: string;
		DetectedPluginTypes: { Name: string; FullName: string }[];
	};
};

class AssemblyEditor implements IEditor<AssemblyItem, Assembly, Organization> {
	iconPath: vscode.Uri;
	htmlPath: vscode.Uri;
	scriptPath: vscode.Uri;

	getPanelId(item: AssemblyItem): string {
		return item?.Id ?? v4();
	}
	getPanelName(item: AssemblyItem): string {
		return item?.Name ?? "New Assembly";
	}

	async getDetailsUpdate(data: Assembly): Promise<AssemblyItem> {
		const item = (await Api.retrieveAssemblyDetails(data.organization.id, data.id)).data as AssemblyItem;
		item.FilePath = PluginBrowserConfiguration.assemblyConfigurations[data.id]?.assemblyPath;
		return item;
	}

	async getDetailsCreate(data: Organization) {
		return undefined;
	}

	renderUpdate(webviewInterface: WebviewInterface, item: AssemblyItem): void {
		webviewInterface.sendMessage("assembly_renderUpdate", item);
	}

	renderCreate(webviewInterface: WebviewInterface): void {
		webviewInterface.sendMessage("assembly_renderCreate", undefined);
	}

	constructor(context: vscode.ExtensionContext) {
		this.iconPath = vscode.Uri.file(path.join(context.extensionPath, "assets", "assembly.svg"));
		this.htmlPath = vscode.Uri.file(
			path.join(context.extensionPath, "dist", "static", "HTML", "assembly-form.html")
		);
		this.scriptPath = vscode.Uri.file(
			path.join(context.extensionPath, "dist", "static", "JS", "assembly_script.js")
		);
	}
}

import * as fs from "fs";
import { JSDOM } from "jsdom";
import * as path from "path";
import { v4 } from "uuid";
import * as vsc from "vscode";
import { Configuration, PluginBrowserConfiguration } from "./Configuration/ConfigurationProxy";
import { Api } from "./Api";
import { Assembly, Image, Organization, Plugin, Step, TreeData } from "./PluginTreeDataProvider";
import { withAuthentication } from "./Utils/connection";
export class EditorProvider {
	async run(
		data: TreeData,
		mode: "add" | "edit",
		progress: vsc.Progress<{ message: string }>,
		context: vsc.ExtensionContext,
		existingPanel?: vsc.WebviewPanel
	): Promise<{ panelId: string; panel: vsc.WebviewPanel }> {
		try {
			const factory = new EditorFactory();
			const editor = factory.getEditor(context, data, mode);
			progress.report({ message: "Fetching Data" });
			const item = await (mode == "add" ? editor.getDetailsCreate(data) : editor.getDetailsUpdate(data));
			progress.report({ message: "Generating Editor" });
			const panelId = editor.getPanelId(item) ?? v4();
			const panelName = editor.getPanelName(item);
			const panel =
				existingPanel ??
				vsc.window.createWebviewPanel(
					panelId,
					panelName,
					vsc.window.activeTextEditor?.viewColumn ?? vsc.ViewColumn.One,
					{
						enableScripts: true,
						localResourceRoots: [
							vsc.Uri.file(path.join(context.extensionPath, "dist", "static", "CSS")),
							vsc.Uri.file(path.join(context.extensionPath, "dist", "static", "JS")),
							vsc.Uri.file(path.join(context.extensionPath, "assets")),
						],
					}
				);
			panel.iconPath = editor.iconPath;
			if (existingPanel != null) {
				panel.reveal(vsc.ViewColumn.One, false);
			}

			progress.report({ message: "Generating Editor" });
			const htmlPath = editor.htmlPath;
			const script = panel.webview.asWebviewUri(editor.scriptPath);
			const style = panel.webview.asWebviewUri(
				vsc.Uri.file(path.join(context.extensionPath, "dist", "static", "CSS", "style.css"))
			);
			const icon = panel.webview.asWebviewUri(editor.iconPath);
			const content = fs
				.readFileSync(htmlPath.fsPath, "utf8")
				.replace("{{style}}", style.toString())
				.replace("{{script}}", script.toString())
				.replace("{{imageicon}}", icon.toString());

			const dom = new JSDOM(content);
			if (mode == "add") editor.renderCreate(dom.window.document, item);
			else editor.renderUpdate(dom.window.document, item);
			panel.webview.html = dom.serialize();
			return { panelId, panel };
		} catch (e) {
			vsc.window.showErrorMessage(e.response?.data?.Message ?? e.message ?? "Unable to edit this element");
			throw e;
		}
	}
}

class EditorFactory {
	getEditor(context: vsc.ExtensionContext, data: TreeData, mode: "add" | "edit"): IEditor<any, TreeData, TreeData> {
		if (mode == "add") {
			if (data.contextValue?.indexOf("step") >= 0) {
				return new ImageEditor(context);
			}
			if (data.contextValue?.indexOf("plugin") >= 0) {
				return new StepEditor(context);
			}
			if (data.contextValue?.indexOf("organization") >= 0) {
				return new AssemblyEditor(context);
			}
		}
		if (mode == "edit") {
			if (data.contextValue?.indexOf("image") >= 0) {
				return new ImageEditor(context);
			}
			if (data.contextValue?.indexOf("step") >= 0) {
				return new StepEditor(context);
			}
			if (data.contextValue?.indexOf("assembly") >= 0) {
				return new AssemblyEditor(context);
			}
		}
		throw new Error("Unknown context value");
	}
}

interface IEditor<I, T, P> {
	iconPath: vsc.Uri;
	htmlPath: vsc.Uri;
	scriptPath: vsc.Uri;
	getPanelId(item: I): string;
	getPanelName(item: I): string;
	getDetailsCreate(data: P): I | Promise<I>;
	getDetailsUpdate(data: T): I | Promise<I>;
	renderCreate(document: Document, item: I): void;
	renderUpdate(document: Document, item: I): void;
}

function createCheckbox(
	document: Document,
	id: string,
	name: string,
	state: boolean,
	attributes: { [key: string]: string }
): HTMLDivElement {
	const control = document.createElement("div");
	control.classList.add("control", "inline");
	const label = document.createElement("label");
	label.classList.add("container", "checkbox");
	const input = document.createElement("input");
	input.type = "checkbox";
	input.name = name;
	input.id = id;
	if (state) input.setAttribute("checked", "true");
	for (const key in attributes) {
		if (attributes.hasOwnProperty(key)) {
			input.setAttribute(key, attributes[key]);
		}
	}
	const span = document.createElement("span");
	span.classList.add("checkmark");

	label.append(input, span);
	control.append(label);
	return control;
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
	iconPath: vsc.Uri;
	htmlPath: vsc.Uri;
	scriptPath: vsc.Uri;
	constructor(context: vsc.ExtensionContext) {
		this.iconPath = vsc.Uri.file(path.join(context.extensionPath, "assets", "image.svg"));
		this.htmlPath = vsc.Uri.file(
			path.join(context.extensionPath, "dist", "static", "HTML", "image-form.html")
		);
		this.scriptPath = vsc.Uri.file(
			path.join(context.extensionPath, "dist", "static", "JS", "image_script.js")
		);
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

	renderUpdate(document: Document, item: ImageItem): void {
		document.getElementById("heading_image_name").textContent = item.Name;
		document.getElementById("input_image_name").setAttribute("value", item.Name);
		document.getElementById("input_image_entity_alias").setAttribute("value", item.EntityAlias);

		if (!item.AvailablePre) {
			document.getElementById("input_container_pre_image").style.display = "none";
		} else {
			if (item.IsPre) {
				document.getElementById("input_image_pre_image").setAttribute("checked", "true");
			}
		}

		if (!item.AvailablePost) {
			document.getElementById("input_container_post_image").style.display = "none";
		} else {
			if (item.IsPost) document.getElementById("input_image_post_image").setAttribute("checked", "true");
		}
		const attributes = item.ImageAttributes;
		const attributeElement = document.createDocumentFragment();
		for (const { Available, DisplayName, LogicalName } of attributes) {
			// Construct Checkbox
			const control = createCheckbox(document, LogicalName, LogicalName, Available, {
				"data-logicalname": LogicalName,
			});
			const checkBoxCell = document.createElement("td");
			checkBoxCell.append(control);

			const displayName = document.createElement("div");
			displayName.classList.add("description");
			const displayNameText = document.createElement("p");
			displayNameText.textContent = `${DisplayName}`;
			const displayNameCell = document.createElement("td");
			displayName.append(displayNameText);
			displayNameCell.append(displayName);

			const logicalName = document.createElement("div");
			logicalName.classList.add("description");
			const logicalNameText = document.createElement("p");
			logicalNameText.textContent = `${LogicalName}`;
			const logicalNameCell = document.createElement("td");
			logicalName.append(logicalNameText);
			logicalNameCell.append(logicalName);

			const row = document.createElement("tr");
			row.setAttribute("data-logicalname", LogicalName);
			row.setAttribute("data-displayname", DisplayName);
			row.append(checkBoxCell, displayNameCell, logicalNameCell);
			attributeElement.append(row);
		}
		document.querySelector("#attribute_container tbody").append(attributeElement);
	}

	renderCreate(document: Document, item: ImageItem): void {
		document.getElementById("heading_image_name").textContent = "New Image";
		document.getElementById("input_image_name").setAttribute("value", "Image");
		document.getElementById("input_image_entity_alias").setAttribute("value", "EntityAlias");
		if (!item.AvailablePre) {
			document.getElementById("input_container_pre_image").style.display = "none";
		} else {
			document.getElementById("input_image_pre_image").setAttribute("checked", "true");
		}

		if (!item.AvailablePost) {
			document.getElementById("input_container_post_image").style.display = "none";
		} else {
			document.getElementById("input_image_post_image").setAttribute("checked", "true");
		}
		const attributes = item.ImageAttributes;
		const attributeElement = document.createDocumentFragment();
		for (const { Available, DisplayName, LogicalName } of attributes) {
			// Construct Checkbox
			const control = createCheckbox(document, LogicalName, LogicalName, Available, {
				"data-logicalname": LogicalName,
			});
			const checkBoxCell = document.createElement("td");
			checkBoxCell.append(control);

			const displayName = document.createElement("div");
			displayName.classList.add("description");
			const displayNameText = document.createElement("p");
			displayNameText.textContent = `${DisplayName}`;
			const displayNameCell = document.createElement("td");
			displayName.append(displayNameText);
			displayNameCell.append(displayName);

			const logicalName = document.createElement("div");
			logicalName.classList.add("description");
			const logicalNameText = document.createElement("p");
			logicalNameText.textContent = `${LogicalName}`;
			const logicalNameCell = document.createElement("td");
			logicalName.append(logicalNameText);
			logicalNameCell.append(logicalName);

			const row = document.createElement("tr");
			row.setAttribute("data-logicalname", LogicalName);
			row.setAttribute("data-displayname", DisplayName);
			row.append(checkBoxCell, displayNameCell, logicalNameCell);
			attributeElement.append(row);
		}
		document.querySelector("#attribute_container tbody").append(attributeElement);
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
	iconPath: vsc.Uri;
	htmlPath: vsc.Uri;
	scriptPath: vsc.Uri;
	private messages: { MessageName: string; MessageId: string }[];
	private entities: { DisplayName: string; LogicalName: string }[];
	private users: { UserName: string; UserId: string }[];
	constructor(context: vsc.ExtensionContext) {
		this.iconPath = vsc.Uri.file(path.join(context.extensionPath, "assets", "step.svg"));
		this.htmlPath = vsc.Uri.file(
			path.join(context.extensionPath, "dist", "static", "HTML", "step-form.html")
		);
		this.scriptPath = vsc.Uri.file(
			path.join(context.extensionPath, "dist", "static", "JS", "step_script.js")
		);
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

	async getDetailsCreate(data: Plugin): Promise<StepItem> {
		const messageReq = await Api.retrieveMessages(data.assembly.organization.id);
		// const entityReq = await Api.retrieveEntities(data.assembly.organization.id);
		const userReq = await Api.retrieveUsers(data.assembly.organization.id);
		this.messages = messageReq.data;
		// this.entities = entityReq.data;
		this.users = userReq.data;
		return null;
	}

	renderUpdate(document: Document, item: StepItem): void {
		document.getElementById("heading_step_name").textContent = item.Name;
		document.getElementById("input_step_name").setAttribute("value", item.Name);
		document.getElementById("input_step_message_name").setAttribute("value", item.MessageName);
		if (item.EntityName && item.EntityName != "none") {
			document.getElementById("input_step_entity_name").setAttribute("value", item.EntityName);
		}
		document.getElementById("input_step_execution_order").setAttribute("value", item.ExecutionOrder.toString());
		const messageNameList = document.getElementById("messages");
		messageNameList.append(
			...this.messages.map((message) => {
				const option = document.createElement("option");
				option.id = "message_" + message.MessageId;
				option.value = message.MessageName;
				option.setAttribute("data-message-id", message.MessageId);
				return option;
			})
		);
		const entityNameList = document.getElementById("entitynames");
		entityNameList.append(
			...this.entities.map((entity) => {
				const option = document.createElement("option");
				option.id = "entity_" + entity.LogicalName;
				option.value = entity.LogicalName;
				option.label = entity.DisplayName;
				return option;
			})
		);
		const userNameList = document.getElementById("input_step_user_context") as HTMLSelectElement;
		const callingUser = document.createElement("option");
		callingUser.value = "";
		callingUser.textContent = callingUser.label = "Calling User";
		callingUser.selected = true;
		userNameList.append(
			callingUser,
			...this.users.map((user) => {
				const option = document.createElement("option");
				option.id = "user_" + user.UserId;
				option.value = user.UserId;
				option.label = option.textContent = user.UserName;
				if (user.UserId == item.UserId) {
					option.setAttribute("selected", "true");
				}
				return option;
			})
		);

		const stageSelection = document.getElementById("input_step_stage") as HTMLSelectElement;
		stageSelection.value = item.Stage.toString();
		stageSelection.querySelector(`option[value="${item.Stage}"]`).setAttribute("selected", "true");

		if (item.IsAsync ?? false) {
			const asyncSelection = document.getElementById("input_step_async") as HTMLInputElement;
			asyncSelection.setAttribute("checked", "true");
		}
		if (item.IsDeployedOnServer ?? false) {
			const deploymentServerSelection = document.getElementById("input_step_deploy_server") as HTMLInputElement;
			deploymentServerSelection.setAttribute("checked", "true");
		}
		if (item.IsDeployedOffline ?? false) {
			const deploymentOfflineSelection = document.getElementById("input_step_deploy_offline") as HTMLInputElement;
			deploymentOfflineSelection.setAttribute("checked", "true");
		}
		const attributes = item.StepAttributes;
		const attributeElement = document.createDocumentFragment();
		for (const { Available, DisplayName, LogicalName } of attributes) {
			// Construct Checkbox
			const control = createCheckbox(document, LogicalName, LogicalName, Available, {
				"data-logicalname": LogicalName,
			});
			const checkBoxCell = document.createElement("td");
			checkBoxCell.append(control);

			const displayName = document.createElement("div");
			displayName.classList.add("description");
			const displayNameText = document.createElement("p");
			displayNameText.textContent = `${DisplayName}`;
			const displayNameCell = document.createElement("td");
			displayName.append(displayNameText);
			displayNameCell.append(displayName);

			const logicalName = document.createElement("div");
			logicalName.classList.add("description");
			const logicalNameText = document.createElement("p");
			logicalNameText.textContent = `${LogicalName}`;
			const logicalNameCell = document.createElement("td");
			logicalName.append(logicalNameText);
			logicalNameCell.append(logicalName);

			const row = document.createElement("tr");
			row.setAttribute("data-logicalname", LogicalName);
			row.setAttribute("data-displayname", DisplayName);
			row.append(checkBoxCell, displayNameCell, logicalNameCell);
			attributeElement.append(row);
		}
		document.querySelector("#attribute_container tbody").append(attributeElement);
	}

	renderCreate(document: Document) {
		document.getElementById("heading_step_name").textContent = "New Step";
		document.getElementById("attribute_column").style.display = "none";
		const messageNameList = document.getElementById("messages");
		messageNameList.append(
			...this.messages.map((message) => {
				const option = document.createElement("option");
				option.id = "message_" + message.MessageId;
				option.value = message.MessageName;
				option.setAttribute("data-message-id", message.MessageId);
				return option;
			})
		);
		// const entityNameList = document.getElementById("entitynames");
		// entityNameList.append(
		// 	...this.entities.map((entity) => {
		// 		const option = document.createElement("option");
		// 		option.id = "entity_" + entity.LogicalName;
		// 		option.value = entity.LogicalName;
		// 		option.label = entity.DisplayName;
		// 		return option;
		// 	})
		// );
		const userNameList = document.getElementById("input_step_user_context") as HTMLSelectElement;
		const callingUser = document.createElement("option");
		callingUser.value = "";
		callingUser.textContent = callingUser.label = "Calling User";
		callingUser.selected = true;
		userNameList.append(
			callingUser,
			...this.users.map((user) => {
				const option = document.createElement("option");
				option.id = "user_" + user.UserId;
				option.value = user.UserId;
				option.label = option.textContent = user.UserName;
				return option;
			})
		);
		(document.getElementById("input_step_execution_order") as HTMLInputElement).setAttribute("value", "1");
		(document.getElementById("input_step_deploy_server") as HTMLInputElement).setAttribute("checked", "true");
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
	iconPath: vsc.Uri;
	htmlPath: vsc.Uri;
	scriptPath: vsc.Uri;

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

	async getDetailsCreate(data: Organization): Promise<AssemblyItem> {
		return null;
	}

	renderUpdate(document: Document, item: AssemblyItem): void {
		document.getElementById("heading_assembly_name").textContent = item.Name;
		document.getElementById("input_assembly_name").setAttribute("value", item.Name);
		if (item.FilePath) {
			document.getElementById("input_assembly_file_location").setAttribute("value", item.FilePath);
		}
		if (item.IsSandboxed) {
			document.getElementById("input_assembly_sandboxed").setAttribute("checked", "true");
		}
		document.getElementById("input_assembly_deployment").setAttribute("value", item.DeploymentMode.toString());
		document.getElementById("input_assembly_metadata_name").setAttribute("value", item.Metadata?.AssemblyName);
		document.getElementById("input_assembly_metadata_version").setAttribute("value", item.Metadata?.Version);
		document.getElementById("input_assembly_metadata_culture").setAttribute("value", item.Metadata?.Culture);
		document.getElementById("input_assembly_metadata_key").setAttribute("value", item.Metadata?.PublicKeyToken);
		const pluginTypes = item.Metadata?.DetectedPluginTypes?.map((pt) => {
			const element = document.createElement("p");
			element.textContent = pt.Name;
			element.id = `assembly_pt_${pt}`;
			element.title = pt.FullName;
			return element;
		});
		document.getElementById("plugin_types").append(...pluginTypes);
	}

	renderCreate(document: Document): void {
		document.getElementById("heading_assembly_name").textContent = "New Assembly";
		document.getElementById("input_assembly_sandboxed").setAttribute("checked", "true");
	}

	constructor(context: vsc.ExtensionContext) {
		this.iconPath = vsc.Uri.file(path.join(context.extensionPath, "assets", "assembly.svg"));
		this.htmlPath = vsc.Uri.file(
			path.join(context.extensionPath, "dist", "static", "HTML", "assembly-form.html")
		);
		this.scriptPath = vsc.Uri.file(
			path.join(context.extensionPath, "dist", "static", "JS", "assembly_script.js")
		);
	}
}

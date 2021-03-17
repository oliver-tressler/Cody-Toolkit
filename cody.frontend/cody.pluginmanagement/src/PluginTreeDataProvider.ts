/* eslint-disable @typescript-eslint/naming-convention */
import * as path from "path";
import * as vsc from "vscode";
import { Api } from "./Api";
import { getConnectionState } from "./Utils/connection";
export type TreeDataType = "organization" | "assembly" | "plugin" | "step" | "image" | "root";

export abstract class TreeData extends vsc.TreeItem {
	constructor(public name: string, public id: string, public type: TreeDataType) {
		super(
			name,
			((type: TreeDataType): vsc.TreeItemCollapsibleState => {
				switch (type) {
					case "image":
						return vsc.TreeItemCollapsibleState.None;
					default:
						return vsc.TreeItemCollapsibleState.Collapsed;
				}
			})(type)
		);
		this.contextValue = type;
		this.id = id;
	}
}

export class Root extends TreeData {
	/**
	 *
	 */
	constructor() {
		super("", "root", "root");
	}
}

export class Organization extends TreeData {
	public assemblies: { [id: string]: Assembly };
	constructor(organizationName: string) {
		super(organizationName, organizationName, "organization");
		this.iconPath = path.resolve(__filename, "..", "..", "assets", "organization.svg");
		this.assemblies = {};
	}
}

export class Assembly extends TreeData {
	public plugins: { [id: string]: Plugin };
	constructor(assemblyName: string, id: string, public watched: boolean, public organization: Organization) {
		super(assemblyName, id, "assembly");
		this.iconPath = path.resolve(
			__filename,
			"..",
			"..",
			"assets",
			watched ? "assemblyWatched.svg" : "assembly.svg"
		);
		this.plugins = {};
		this.contextValue = watched ? "assemblyWatched" : "assembly";
	}
}

export class Plugin extends TreeData {
	public steps: { [id: string]: Step };
	constructor(pluginName: string, id: string, public assembly: Assembly) {
		super(pluginName, id, "plugin");
		this.iconPath = path.resolve(__filename, "..", "..", "assets", "plugin.svg");
		this.steps = {};
	}
}

export class Step extends TreeData {
	public images: { [id: string]: Image };
	constructor(
		stepName: string,
		id: string,
		public disabled: boolean,
		public canHaveImages: boolean,
		public plugin: Plugin
	) {
		super(stepName, id, "step");
		this.iconPath = path.resolve(__filename, "..", "..", "assets", disabled ? "stepDisabled.svg" : "step.svg");
		this.contextValue = disabled ? "stepDisabled" : "step";
		if (!canHaveImages) {
			this.contextValue += "NoImage";
			this.collapsibleState = vsc.TreeItemCollapsibleState.None;
		}
		this.images = {};
	}
}

export class Image extends TreeData {
	constructor(imageName: string, id: string, public step: Step) {
		super(imageName, id, "image");
		this.iconPath = path.resolve(__filename, "..", "..", "assets", "image.svg");
	}
}

// A typed tree data provider as there are different elements with different behaviors
abstract class TreeDataProvider<T, C, P> {
	constructor(protected treeElement: T) {}
	abstract getChildren(): Promise<C[]>;
	abstract getElement(): vsc.TreeItem | undefined;
	abstract getParent(): P | undefined;
}

class OrganizationTreeDataProvider extends TreeDataProvider<Organization, Assembly, TreeData> {
	async getChildren(): Promise<Assembly[]> {
		const response = await Api.retrieveAssemblies(this.treeElement.id);
		const result: Assembly[] = response.data.map(
			(r: { Id: string; Name: string; IsWatched: boolean }) =>
				new Assembly(r.Name, r.Id, r.IsWatched, this.treeElement)
		);
		const resultDict: { [id: string]: Assembly } = {};
		this.treeElement.assemblies = result.reduce((pre, cur) => {
			pre[cur.name] = cur;
			return pre;
		}, resultDict);
		return result;
	}
	getElement(): vsc.TreeItem {
		return this.treeElement;
	}
	getParent(): TreeData | undefined {
		return undefined;
	}
}

class AssemblyTreeDataProvider extends TreeDataProvider<Assembly, Plugin, Organization> {
	async getChildren(): Promise<Plugin[]> {
		const response = await Api.retrievePlugins(this.treeElement.organization.id, this.treeElement.id);
		const result: Plugin[] = response.data.map(
			(r: { Id: string; Name: string }) => new Plugin(r.Name, r.Id, this.treeElement)
		);
		const resultDict: { [id: string]: Plugin } = {};
		this.treeElement.plugins = result.reduce((pre, cur) => {
			pre[cur.id] = cur;
			return pre;
		}, resultDict);
		return result;
	}

	getElement(): vsc.TreeItem {
		return this.treeElement;
	}

	getParent(): Organization {
		return this.treeElement.organization;
	}
}

class PluginTreeDataProvider extends TreeDataProvider<Plugin, Step, Assembly> {
	async getChildren(): Promise<Step[]> {
		const response = await Api.retrieveSteps(this.treeElement.assembly.organization.id, this.treeElement.id);
		const result: Step[] = response.data.map(
			(r: { Id: string; Name: string; IsDisabled: boolean; CanHaveImages: boolean }) =>
				new Step(r.Name, r.Id, r.IsDisabled, r.CanHaveImages, this.treeElement)
		);
		const resultDict: { [id: string]: Step } = {};
		this.treeElement.steps = result.reduce((pre, cur) => {
			pre[cur.id] = cur;
			return pre;
		}, resultDict);
		return result;
	}

	getElement(): vsc.TreeItem {
		return this.treeElement;
	}

	getParent(): Assembly {
		return this.treeElement.assembly;
	}
}

class StepTreeDataProvider extends TreeDataProvider<Step, Image, Plugin> {
	async getChildren(): Promise<Image[]> {
		const response: {
			IsPre: boolean;
			IsPost: boolean;
			Name: string;
			Id: string;
		}[] =
			(await Api.retrieveImages(this.treeElement.plugin.assembly.organization.id, this.treeElement.id))?.data ??
			[];
		const result: Image[] = [];
		for (const r of response) {
			if (r.IsPre) {
				result.push(new Image("PRE - " + r.Name, r.Id + "PRE", this.treeElement));
			}
			if (r.IsPost) {
				result.push(new Image("POST - " + r.Name, r.Id + "POST", this.treeElement));
			}
		}
		return result;
	}

	getElement(): vsc.TreeItem {
		return this.treeElement;
	}

	getParent(): Plugin {
		return this.treeElement.plugin;
	}
}

class ImageTreeDataProvider extends TreeDataProvider<Image, TreeData, Step> {
	async getChildren(): Promise<[]> {
		return [];
	}
	getElement(): vsc.TreeItem {
		return this.treeElement;
	}

	getParent(): Step {
		return this.treeElement.step;
	}
}

class RootTreeDataProvider extends TreeDataProvider<Root, TreeData, TreeData> {
	constructor(private org?: Organization) {
		super(new Root());
	}

	async getChildren(): Promise<TreeData[]> {
		return this.org ? [this.org] : [];
	}
	getElement(): vsc.TreeItem | undefined {
		return undefined;
	}

	getParent(): TreeData | undefined {
		return undefined;
	}
}

class TreeDataProviderFactory {
	async getProvider(data?: TreeData): Promise<TreeDataProvider<TreeData, TreeData, TreeData>> {
		if (data == null) {
			const activeOrganizationName = (await getConnectionState())?.activeOrganization?.UniqueName;
			return new RootTreeDataProvider(
				activeOrganizationName != null ? new Organization(activeOrganizationName) : undefined
			);
		}
		switch (data.type) {
			case "organization":
				return new OrganizationTreeDataProvider(data as Organization);
			case "assembly":
				return new AssemblyTreeDataProvider(data as Assembly);
			case "plugin":
				return new PluginTreeDataProvider(data as Plugin);
			case "step":
				return new StepTreeDataProvider(data as Step);
			case "image":
				return new ImageTreeDataProvider(data as Image);
			case "root":
				return new RootTreeDataProvider(undefined);
		}
	}
}

export class DataProvider implements vsc.TreeDataProvider<TreeData> {
	readonly onDidChangeTreeData?: vsc.Event<TreeData | undefined>;
	private dataProviderFactory: TreeDataProviderFactory;
	private rootElement: Organization | undefined;
	private refresher: NodeJS.Timeout;
	constructor() {
		this.dataProviderFactory = new TreeDataProviderFactory();
		this.onDidChangeTreeData = this._onDidChangeTreeData.event;
		// Use polling to see if organization changes
		this.refresher = setInterval(async () => {
			const connectionState = await getConnectionState();
			if (connectionState?.activeOrganization?.UniqueName === this.rootElement?.id) {
				return;
			}
			this._onDidChangeTreeData.fire(undefined);
		}, 7500);
	}

	async getTreeItem(element?: TreeData) {
		return (await this.dataProviderFactory.getProvider(element)).getElement() ?? {};
	}
	async getChildren(element?: TreeData): Promise<TreeData[]> {
		const children = (await (await this.dataProviderFactory?.getProvider(element)).getChildren()) ?? [];
		if (this.rootElement == null && children.length === 1 && children[0].type === "organization") {
			this.rootElement = children[0] as Organization;
		}
		return children;
	}

	async getParent(element?: TreeData) {
		return (await this.dataProviderFactory.getProvider(element)).getParent();
	}

	refreshElement() {
		this._onDidChangeTreeData.fire(this.rootElement);
	}

	dispose() {
		try {
			clearInterval(this.refresher);
		} catch {}
	}

	private _onDidChangeTreeData: vsc.EventEmitter<TreeData | undefined> = new vsc.EventEmitter<TreeData | undefined>();
}

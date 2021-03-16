import { AxiosError, AxiosResponse } from "axios";
import * as vsc from "vscode";
import { AssemblyConfiguration, Configuration, PluginBrowserConfiguration } from "./Configuration/ConfigurationProxy";
import { Api } from "./Api";
import { AssemblyPluginMetadata } from "./PluginBrowserProvider";
import { EditorProvider } from "./PluginEditor";
import { Organization, Plugin, Step, TreeData, TreeDataType } from "./PluginTreeDataProvider";
import { WebviewExtensionInterface, WebviewRequest } from "./WebviewExtensionInterface";
import { withAuthentication } from "./Utils/connection";
type PanelInfo = {
	panelId: string;
	panel: vsc.WebviewPanel;
};

export class PluginEditorProvider {
	private createdPanels: { [treeItemId: string]: vsc.WebviewPanel };
	constructor(context: vsc.ExtensionContext) {
		this.createdPanels = {};
		context.subscriptions.push(
			vsc.commands.registerCommand(
				"extension.crmtooling.pluginsandsteps.add",
				async (data: Organization | Plugin | Step) => {
					return await withAuthentication(async ({ activeOrganization }) => {
						const provider = new EditorProvider();
						const panelInfo = await vsc.window.withProgress(
							{
								location: vsc.ProgressLocation.Notification,
								cancellable: false,
								title: "Launching Editor",
							},
							async (progress) => {
								return await provider.run(data, "add", progress, context, undefined);
							}
						);
						this.createdPanels[panelInfo.panelId] = panelInfo.panel;
						panelInfo.panel.onDidDispose(() => {
							delete this.createdPanels[panelInfo.panelId];
							this.unlinkPanel(this.panelIdToDataMap[panelInfo.panelId]);
						});
						const webviewExtensionInterface = new WebviewExtensionInterface(panelInfo.panel);
						webviewExtensionInterface.on("plugineditor_pickfile", "assemblyfilepicker", async (message) => {
							return this.getAssemblyFilePath(message, this.panelIdToDataMap[panelInfo.panelId]);
						});

						// In this case, the data element is the parent element of the item to be created. Thus, data.id
						// cannot be used. Instead, we rely on the panel id that is generated by the editor provider in case
						// an add panel is requested. When the first save is successful, the behavior of the panel should
						// switch from create to update. The issue here is, that the id returned by the CRM and the id
						// generated by the editor provider are not the same.
						// When a save operation was sucessful, the CRM id returned by the server is mapped to the local
						// panel id via panelIdToDataMap. If an entry is found for this panel id, we can be sure that this
						// panel is now in edit mode.
						webviewExtensionInterface.on("plugineditor_saveassembly", "assemblysave", async (message) => {
							const existingPanelDataId = this.panelIdToDataMap[panelInfo.panelId];
							if (existingPanelDataId) {
								return await this.saveAssembly(message, panelInfo, {
									mode: "edit",
									id: existingPanelDataId,
								});
							} else {
								return await this.saveAssembly(message, panelInfo, {
									mode: "add",
								});
							}
						});

						webviewExtensionInterface.on("plugineditor_savestep", "stepsave", async (message) => {
							// Data is already the parent element here.
							const existingPanelDataId = this.panelIdToDataMap[panelInfo.panelId];
							if (existingPanelDataId) {
								return await this.saveStep(message, panelInfo, {
									mode: "edit",
									stepId: existingPanelDataId,
								});
							} else {
								return await this.saveStep(message, panelInfo, {
									mode: "add",
									pluginId: data.id,
								});
							}
						});
						webviewExtensionInterface.on(
							"plugineditor_requeststepattributes",
							"stepattributes",
							async (message) => {
								const response = message.payload as { EntityName: string };
								try {
									return (
										await Api.retrieveStepAttributes(
											activeOrganization.UniqueName,
											response.EntityName
										)
									).data;
								} catch (e) {
									vsc.window.showErrorMessage((e as AxiosError).response?.data.Message ?? e.message);
								}
							}
						);
						webviewExtensionInterface.on(
							"plugineditor_requeststepentities",
							"stepentities",
							async (message) => {
								const data = message.payload as { MessageId: string };
								try {
									return (
										await Api.retrieveEntities(activeOrganization.UniqueName, data.MessageId)
									).data;
								} catch (e) {
									vsc.window.showErrorMessage((e as AxiosError).response?.data.Message ?? e.message);
								}
							}
						);
						webviewExtensionInterface.on("plugineditor_saveimage", "imagesave", async (message) => {
							// Data is already the parent element here.
							const existingPanelDataId = this.panelIdToDataMap[panelInfo.panelId];
							if (existingPanelDataId) {
								return await this.saveImage(message, panelInfo, {
									mode: "edit",
									imageId: existingPanelDataId,
								});
							} else {
								return await this.saveImage(message, panelInfo, {
									mode: "add",
									stepId: data.id,
								});
							}
						});
					});
				}
			),
			vsc.commands.registerCommand("extension.crmtooling.pluginsandsteps.edit", async (data: TreeData) => {
				return await withAuthentication(async ({ activeOrganization }) => {
					const cleanedId = data.id.replace("POST", "").replace("PRE", "");
					const panelId = this.dataToPanelIdMap[cleanedId] || cleanedId;
					const provider = new EditorProvider();

					const panelInfo = await vsc.window.withProgress(
						{
							location: vsc.ProgressLocation.Notification,
							cancellable: false,
							title: "Launching Editor",
						},
						async (progress) => {
							return await provider.run(data, "edit", progress, context, this.createdPanels[panelId]);
						}
					);

					panelInfo.panel.onDidDispose(() => {
						delete this.createdPanels[panelId];
						this.unlinkPanel(panelId);
					});
					this.createdPanels[panelId] = panelInfo.panel;

					const webviewExtensionInterface = new WebviewExtensionInterface(panelInfo.panel);
					webviewExtensionInterface.on("plugineditor_pickfile", "assemblyfilepicker", async (message) => {
						return await this.getAssemblyFilePath(message, cleanedId);
					});
					webviewExtensionInterface.on("plugineditor_saveassembly", "assemblysave", async (message) => {
						return await this.saveAssembly(message, panelInfo, { mode: "edit", id: cleanedId });
					});
					webviewExtensionInterface.on("plugineditor_savestep", "stepsave", async (message) => {
						return await this.saveStep(message, panelInfo, { mode: "edit", stepId: cleanedId });
					});
					webviewExtensionInterface.on("plugineditor_saveimage", "imagesave", async (message) => {
						return await this.saveImage(message, panelInfo, { mode: "edit", imageId: cleanedId });
					});
					webviewExtensionInterface.on(
						"plugineditor_requeststepattributes",
						"stepattributes",
						async (message) => {
							const response = message.payload as { EntityName: string };
							try {
								return (
									await Api.retrieveStepAttributes(
										activeOrganization.UniqueName,
										response.EntityName
									)
								).data;
							} catch (e) {
								vsc.window.showErrorMessage((e as AxiosError).response?.data.Message ?? e.message);
							}
						}
					);
					webviewExtensionInterface.on(
						"plugineditor_requeststepentities",
						"stepentities",
						async (message) => {
							const data = message.payload as { MessageId: string };
							try {
								return (await Api.retrieveEntities(activeOrganization.UniqueName, data.MessageId))
									.data;
							} catch (e) {
								vsc.window.showErrorMessage((e as AxiosError).response?.data.Message ?? e.message);
							}
						}
					);
				});
			}),
			vsc.commands.registerCommand("extension.crmtooling.pluginsandsteps.delete", async (data: TreeData) => {
				return await withAuthentication(async ({ activeOrganization }) => {
					const cleanedId = data.id.replace("POST", "").replace("PRE", "");
					const response = await vsc.window.showQuickPick(["Yes", "No"], {
						canPickMany: false,
						ignoreFocusOut: false,
						placeHolder: `Are you sure that you want to delete ${data.name}?`,
					});
					if (!response || response == "No") {
						vsc.window.showErrorMessage("Aborted");
						return;
					}
					try {
						switch (data.type) {
							case "assembly":
								await Api.deleteAssembly(activeOrganization.UniqueName, cleanedId);
								vsc.window.showInformationMessage(`Assembly ${data.name} deleted.`);
								break;
							case "plugin":
								await Api.deletePlugin(activeOrganization.UniqueName, cleanedId);
								vsc.window.showInformationMessage(`Plugin ${data.name} deleted.`);
								break;
							case "step":
								await Api.deleteStep(activeOrganization.UniqueName, cleanedId);
								vsc.window.showInformationMessage(`Step ${data.name} deleted.`);
								break;
							case "image":
								await Api.deleteImage(activeOrganization.UniqueName, cleanedId);
								vsc.window.showInformationMessage(`Image ${data.name} deleted.`);
								break;
							default:
								throw new Error("This data type cannot be deleted.");
						}
						this.refresh();
					} catch (e) {
						vsc.window.showErrorMessage((e as AxiosError).response?.data.Message ?? e.message);
					}
					this.createdPanels[this.dataToPanelIdMap[cleanedId] || cleanedId]?.dispose();
					this.unlinkData(data.id);
				});
			})
		);
	}

	refresh() {
		vsc.commands.executeCommand("extension.crmtooling.pluginsandsteps.reload");
	}

	private async promptForAssemblyPath(payload: { fileType: string }) {
		const files = await vsc.window.showOpenDialog({
			canSelectFiles: payload.fileType !== "folder",
			canSelectFolders: payload.fileType === "folder",
			canSelectMany: false,
			filters: {
				Assembly: ["dll", "DLL"],
			},
			openLabel: "Load",
			title: "Select Local Assembly",
		});
		if (files == null || files.length !== 1) {
			return "";
			// throw new Error("No Assembly Selected");
		}
		return files[0].fsPath;
	}

	private async getAssemblyFilePath(message: WebviewRequest, id?: string) {
		const payload: { fileType: string; path: string } = message.payload;
		const file = payload.path || ((await this.promptForAssemblyPath(payload)) ?? "");
		if (id) {
			const assemblyConfigurations = PluginBrowserConfiguration.assemblyConfigurations;
			const assemblyInfo = {
				assemblyId: id,
				assemblyPath: file,
			};
			assemblyConfigurations[id] = assemblyInfo;
			PluginBrowserConfiguration.assemblyConfigurations = assemblyConfigurations;
		}
		const assemblyMetadata = await Api.retrieveAssemblyMetadata(file);
		return {
			path: file,
			metadata: assemblyMetadata.data,
		};
	}

	private async saveAssembly(
		message: WebviewRequest,
		panelInfo: PanelInfo,
		options: { mode: "add" | "edit"; id?: string }
	): Promise<{ AssemblyName: string; Id: string } | undefined> {
		return await withAuthentication(async ({ activeOrganization }) => {
			const payload: { IsSandboxed: boolean; DeploymentMode: number; FilePath: string } = message.payload;
			try {
				return await vsc.window.withProgress(
					{ location: vsc.ProgressLocation.Notification, cancellable: false, title: "Saving assembly" },
					async (_) => {
						let response: AxiosResponse<any>;
						if (options.mode == "add") {
							if (!payload.FilePath) {
								vsc.window.showErrorMessage("File Path is required for creating a new assembly record");
								return undefined;
							}
							response = await Api.createAssembly(activeOrganization.UniqueName, payload);
							panelInfo.panel.title = response.data.AssemblyName;
							this.linkPanelToData(panelInfo.panelId, response.data.Id);
							vsc.window.showInformationMessage(
								`Assembly ${response.data.AssemblyName} has been created`
							);
						} else {
							if (PluginBrowserConfiguration.askBeforeAutomaticallyRemovingPlugins) {
								const diffReq = await Api.getAssemblyPluginDifferences(
									activeOrganization.UniqueName,
									options.id!,
									payload.FilePath
								);
								const diff: {
									Matching: AssemblyPluginMetadata[];
									MissingLocal: AssemblyPluginMetadata[];
									MissingServer: AssemblyPluginMetadata[];
								} = diffReq.data;
								if (
									diff.MissingServer.length > 0 &&
									(await vsc.window.showInformationMessage(
										"The following plugins are missing and would be unregistered: " +
											diff.MissingServer.map((val) => val.Name).join(", "),
										"Proceed anyway",
										"Cancel"
									)) != "Proceed anyway"
								) {
									return undefined;
								}
							}
							response = await Api.updateAssemblyDetails(
								activeOrganization.UniqueName,
								options.id!,
								payload
							);
							vsc.window.showInformationMessage(
								`Assembly ${response.data.AssemblyName} has been updated`
							);
						}

						this.refresh();
						return { AssemblyName: response.data.AssemblyName, Id: response.data.Id };
					}
				);
			} catch (e) {
				vsc.window.showErrorMessage((e as AxiosError).response?.data.Message ?? e.message);
				throw e;
			}
		});
	}

	private async saveStep(
		message: { payload: string },
		panelInfo: PanelInfo,
		options: { mode: "add"; pluginId: string }
	): Promise<{ StepName: string; Id: string }>;
	private async saveStep(
		message: { payload: string },
		panelInfo: PanelInfo,
		options: { mode: "edit"; stepId: string }
	): Promise<{ StepName: string; Id: string }>;
	private async saveStep(
		message: { payload: string },
		panelInfo: PanelInfo,
		options: { mode: "add" | "edit"; pluginId?: string; stepId?: string }
	): Promise<{ StepName: string; Id: string }> {
		return await withAuthentication(async ({ activeOrganization }) => {
			const payload = message.payload;
			try {
				return await vsc.window.withProgress(
					{ location: vsc.ProgressLocation.Notification, cancellable: false, title: "Saving Step" },
					async (_) => {
						let response: AxiosResponse<any>;
						if (options.mode == "add") {
							response = await Api.createStep(activeOrganization.UniqueName, options.pluginId!, payload);
							panelInfo.panel.title = response.data.StepName;
							this.linkPanelToData(panelInfo.panelId, response.data.Id);
							vsc.window.showInformationMessage(`Step ${response.data.StepName} has been created`);
						} else {
							response = await Api.updateStepDetails(
								activeOrganization.UniqueName,
								options.stepId!,
								payload
							);
							vsc.window.showInformationMessage(`Step ${response.data.StepName} has been updated`);
						}
						this.refresh();
						return { StepName: response.data.StepName, Id: response.data.Id };
					}
				);
			} catch (e) {
				vsc.window.showErrorMessage((e as AxiosError).response?.data.Message ?? e.message);
				throw e;
			}
		});
	}

	private async saveImage(
		message: { payload: string },
		panelInfo: PanelInfo,
		options: { mode: "add"; stepId: string }
	): Promise<{ ImageName: string; Id: string }>;
	private async saveImage(
		message: { payload: string },
		panelInfo: PanelInfo,
		options: { mode: "edit"; imageId: string }
	): Promise<{ ImageName: string; Id: string }>;
	private async saveImage(
		message: { payload: string },
		panelInfo: PanelInfo,
		options: { mode: "add" | "edit"; stepId?: string; imageId?: string }
	): Promise<{ ImageName: string; Id: string }> {
		return await withAuthentication(async ({ activeOrganization }) => {
			const payload = message.payload;
			try {
				return await vsc.window.withProgress(
					{ location: vsc.ProgressLocation.Notification, cancellable: false, title: "Saving Image" },
					async (_) => {
						let response: AxiosResponse<any>;
						if (options.mode === "add") {
							response = await Api.createImage(activeOrganization.UniqueName, options.stepId!, payload);
							panelInfo.panel.title = response.data.ImageName;
							this.linkPanelToData(panelInfo.panelId, response.data.Id);
							vsc.window.showInformationMessage("Image has been created");
						} else {
							response = await Api.updateImageDetails(
								activeOrganization.UniqueName,
								options.imageId!,
								payload
							);
							vsc.window.showInformationMessage("Image has been updated");
						}
						this.refresh();
						return { ImageName: response.data.ImageName, Id: response.data.Id };
					}
				);
			} catch (e) {
				vsc.window.showErrorMessage((e as AxiosError).response?.data.Message ?? e.message);
				throw e;
			}
		});
	}

	private panelIdToDataMap: { [panelId: string]: string } = {};
	private dataToPanelIdMap: { [dataId: string]: string } = {};
	private linkPanelToData(panelId: string, dataId: string) {
		if (!panelId || !dataId) return;
		this.panelIdToDataMap[panelId] = dataId;
		this.dataToPanelIdMap[dataId] = panelId;
	}

	private unlinkPanel(panelId: string) {
		if (!panelId) return;
		delete this.panelIdToDataMap[panelId];
		Object.keys(this.dataToPanelIdMap)
			.filter((id) => this.dataToPanelIdMap[id] == panelId)
			.forEach((id) => {
				delete this.dataToPanelIdMap[id];
			});
	}

	private unlinkData(dataId: string) {
		if (!dataId) return;
		delete this.dataToPanelIdMap[dataId];
		Object.keys(this.dataToPanelIdMap)
			.filter((id) => this.panelIdToDataMap[id] == dataId)
			.forEach((id) => {
				delete this.panelIdToDataMap[id];
			});
	}
}
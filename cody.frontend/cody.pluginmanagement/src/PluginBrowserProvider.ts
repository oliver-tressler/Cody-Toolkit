import { AxiosError } from "axios";
import * as vsc from "vscode";
import { Api } from "./Api";
import { PluginBrowserConfiguration } from "./Configuration/ConfigurationProxy";
import { Assembly, DataProvider, Step, TreeData } from "./PluginTreeDataProvider";
import { withAuthentication } from "./Utils/connection";
export type AssemblyPluginMetadata = {
	FullName: string;
	Name: string;
};
export class PluginBrowserProvider implements vsc.Disposable {
	private dataProvider: DataProvider;
	constructor({ subscriptions }: vsc.ExtensionContext) {
		this.dataProvider = new DataProvider();
		const treeView: vsc.TreeView<TreeData | undefined> = vsc.window.createTreeView("cody-toolkit.pluginsandsteps", {
			treeDataProvider: this.dataProvider,
			canSelectMany: false,
			showCollapseAll: true,
		});
		subscriptions.push(
			treeView,
			vsc.commands.registerCommand("cody.toolkit.pluginmanagement.reload", async () => {
				this.dataProvider?.refreshElement();
			}),
			vsc.commands.registerCommand("cody.toolkit.pluginmanagement.watch", async (data: Assembly) => {
				await withAuthentication(async ({ activeOrganization }) => {
					const assemblyConfigurations = PluginBrowserConfiguration.assemblyConfigurations;
					let assemblyConfig = assemblyConfigurations[data.id];
					if (!assemblyConfig?.assemblyPath) {
						const file = await vsc.window.showOpenDialog({
							canSelectFiles: true,
							canSelectFolders: false,
							canSelectMany: false,
							filters: {
								Assembly: ["dll", "DLL"],
							},
							openLabel: "Load",
							title: "Select Local Assembly",
						});
						if (file == null || file.length === 0) {
							return;
						}
						assemblyConfig = {
							assemblyId: data.id,
							assemblyPath: file[0].fsPath,
						};
						assemblyConfigurations[data.id] = assemblyConfig;
					}
					if (PluginBrowserConfiguration.askBeforeAutomaticallyRemovingPlugins) {
						const diffReq = await Api.getAssemblyPluginDifferences(
							activeOrganization.UniqueName,
							data.id,
							assemblyConfig.assemblyPath
						);
						const diff: {
							Matching: AssemblyPluginMetadata[];
							MissingLocal: AssemblyPluginMetadata[];
							MissingServer: AssemblyPluginMetadata[];
						} = diffReq.data;
						if (
							diff.MissingLocal.length > 0 &&
							(await vsc.window.showInformationMessage(
								"The following plugins are missing and would be unregistered: " +
									diff.MissingLocal.map((val) => val.Name).join(", "),
								"Proceed anyway",
								"Cancel"
							)) !== "Proceed anyway"
						) {
							return;
						}
					}

					PluginBrowserConfiguration.assemblyConfigurations = assemblyConfigurations;
					try {
						await Api.watchAssembly(activeOrganization.UniqueName, data.id, assemblyConfig.assemblyPath);
					} catch (e) {
						const error = e as AxiosError;
						vsc.window.showErrorMessage(error.response?.data?.Message ?? e.message);
						return;
					}
					vsc.window.showInformationMessage(`${data.name} is being watched.`);
					this.dataProvider?.refreshElement();
				});
			}),
			vsc.commands.registerCommand("cody.toolkit.pluginmanagement.unwatch", async (data: Assembly) => {
				await withAuthentication(async ({ activeOrganization }) => {
					await Api.unwatchAssembly(activeOrganization.UniqueName, data.id);
					vsc.window.showInformationMessage(`Stopped watching ${data.name}.`);
					this.dataProvider?.refreshElement();
				});
			}),
			vsc.commands.registerCommand("cody.toolkit.pluginmanagement.enable", async (data: Step) => {
				await withAuthentication(async ({ activeOrganization }) => {
					await vsc.window.withProgress(
						{
							location: vsc.ProgressLocation.Notification,
							cancellable: false,
							title: `Disabling ${data.name}`,
						},
						async (_) => {
							await Api.enableStep(activeOrganization.UniqueName, data.id);
						}
					);
					vsc.window.showInformationMessage("Step disabled");
					this.dataProvider?.refreshElement();
				});
			}),
			vsc.commands.registerCommand("cody.toolkit.pluginmanagement.disable", async (data: Step) => {
				await withAuthentication(async ({ activeOrganization }) => {
					await vsc.window.withProgress(
						{
							location: vsc.ProgressLocation.Notification,
							cancellable: false,
							title: `Disabling ${data.name}`,
						},
						async (_) => {
							await Api.disableStep(activeOrganization.UniqueName, data.id);
						}
					);
					vsc.window.showInformationMessage("Step disabled");
					this.dataProvider?.refreshElement();
				});
			})
		);
	}
	dispose() {
		this.dataProvider.dispose();
	}
}

import * as vscode from "vscode";

/**
 * Wrapper around the VS Code Settings API. Basic property override by using experimental annotation API.
 * @param section Path to the setting excluding the name.
 * @param scope Workspace Folder, Workspace or User.
 * @param transform Transform value before retrieving and/or updating a setting.
 */
function config(
	section: string,
	scope: vscode.ConfigurationTarget | "private",
	transform?: { getTransform?: (val: any) => any; setTransform?: (val: any) => any }
) {
	return (target: Object, key: string | symbol) => {
		if (typeof key != "string") {
			throw new Error("Annotation is only valid for leaf nodes");
		}
		const getter = () => {
			const configValue = vscode.workspace.getConfiguration(section).get(key);
			if (transform?.getTransform) {
				return transform.getTransform(configValue);
			}
			return configValue;
		};
		const setter = (val: any) => {
			let configValue = val;
			if (transform?.setTransform) {
				configValue = transform.setTransform(val);
			}
			switch (scope) {
				// Depending on the configuration target, set this everywhere. Otherwise, we could have issues with
				// user overrides.
				case vscode.ConfigurationTarget.Global:
					vscode.workspace.getConfiguration(section).update(key, val, vscode.ConfigurationTarget.Global);
					vscode.workspace.getConfiguration(section).update(key, val, vscode.ConfigurationTarget.Workspace);
					vscode.workspace
						.getConfiguration(section)
						.update(key, val, vscode.ConfigurationTarget.WorkspaceFolder);
					break;
				case vscode.ConfigurationTarget.Workspace:
					vscode.workspace.getConfiguration(section).update(key, val, vscode.ConfigurationTarget.Workspace);
					vscode.workspace
						.getConfiguration(section)
						.update(key, val, vscode.ConfigurationTarget.WorkspaceFolder);
					break;
				case vscode.ConfigurationTarget.WorkspaceFolder:
					vscode.workspace
						.getConfiguration(section)
						.update(key, val, vscode.ConfigurationTarget.WorkspaceFolder);
					break;
			}
		};
		Reflect.deleteProperty(target, key);
		Reflect.defineProperty(target, key, {
			get: getter,
			set: setter,
		});
	};
}

export class Configuration {
	@config("cody.toolkit.core", vscode.ConfigurationTarget.Global)
	/**
	 * Port used by the backend service.
	 */
	static backendServerPort: number;
	@config("cody.toolkit.proxyGenerator", vscode.ConfigurationTarget.Global)
	/**
	 * How to select entities for proxy generation.
	 */
	static selectionMode: "Freetext" | "QuickPick";
}

export class TypeScriptConfiguration extends Configuration {
	@config("cody.toolkit.proxyGenerator.ts", vscode.ConfigurationTarget.Workspace)
	/**
	 * Folder that typescript proxy files should be written to.
	 */
	static proxyFolder: string;
	@config("cody.toolkit.proxyGenerator.ts", vscode.ConfigurationTarget.Workspace, {
		getTransform: (val) => val === "true",
		setTransform: (val) => val.toString(),
	})
	/**
	 * If active, global enums will be generated in addition to local enums.
	 */
	static globalEnums: boolean;
	@config("cody.toolkit.proxyGenerator.ts", vscode.ConfigurationTarget.Workspace, {
		getTransform: (val) => val === "true",
		setTransform: (val) => val.toString(),
	})
	static restartTsLanguageServerWhenCreatingNewFiles: boolean;
}

import * as vsc from "vscode";

/**
 * Wrapper around the VS Code Settings API. Basic property override by using experimental annotation API.
 * @param section Path to the setting excluding the name.
 * @param scope Workspace Folder, Workspace or User.
 * @param transform Transform value before retrieving and/or updating a setting.
 */
function config(
	section: string,
	scope: vsc.ConfigurationTarget | "private",
	transform?: { getTransform?: (val: any) => any; setTransform?: (val: any) => any }
) {
	return (target: Object, key: string | symbol) => {
		if (typeof key != "string") throw new Error("Annotation is only valid for leaf nodes");
		const getter = () => {
			const configValue = vsc.workspace.getConfiguration(section).get(key);
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
				case vsc.ConfigurationTarget.Global:
					vsc.workspace.getConfiguration(section).update(key, val, vsc.ConfigurationTarget.Global);
					vsc.workspace.getConfiguration(section).update(key, val, vsc.ConfigurationTarget.Workspace);
					vsc.workspace.getConfiguration(section).update(key, val, vsc.ConfigurationTarget.WorkspaceFolder);
					break;
				case vsc.ConfigurationTarget.Workspace:
					vsc.workspace.getConfiguration(section).update(key, val, vsc.ConfigurationTarget.Workspace);
					vsc.workspace.getConfiguration(section).update(key, val, vsc.ConfigurationTarget.WorkspaceFolder);
					break;
				case vsc.ConfigurationTarget.WorkspaceFolder:
					vsc.workspace.getConfiguration(section).update(key, val, vsc.ConfigurationTarget.WorkspaceFolder);
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
	@config("cody.toolkit.core", vsc.ConfigurationTarget.Global)
	/**
	 * Absolute filepath to the backend server.
	 */
	static backendServerLocation: string;
	@config("cody.toolkit.core", vsc.ConfigurationTarget.Global)
	/**
	 * Port used by the backend service.
	 */
	static backendServerPort: number;
	@config("cody.toolkit.core", vsc.ConfigurationTarget.Workspace)
	/**
	 * Disables the SSL Certificate check. Not recommended.
	 */
	 static disableSSLCertificateCheck: boolean;
	 @config("cody.toolkit.core", vsc.ConfigurationTarget.Workspace)
	/**
	 * CWD to enable relative paths.
	 */
	static projectRootPath: string;
}

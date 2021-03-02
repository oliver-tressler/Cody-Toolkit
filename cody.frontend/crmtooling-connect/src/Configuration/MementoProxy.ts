import { Memento } from "vscode";

/**
 * Some configuration values should not be modified by the user. For these settings the VS Code Memento API is used.
 */
class MementoProxy {
	constructor(private storage: Memento) {}
	/**
	 * @param key setting identifier
	 */
	protected getItem<T>(key: string): T | undefined {
		return this.storage.get<T>(key);
	}
	/**
	 * Get an item or set the item to a default value and return the default value.
	 * @param key Setting identifier.
	 * @param defaultValue
	 */
	protected getItemOrDefault<T>(key: string, defaultValue: T): T {
		const item = this.getItem<T>(key);
		if (item == null) {
			this.setItem(key, defaultValue);
			return defaultValue;
		}
		return item;
	}
	/**
	 * @param key Setting identifier.
	 * @param value
	 */
	protected setItem<T>(key: string, value: T) {
		this.storage.update(key, value);
	}
}

/**
 * Store instance configurations in the workspace memento object.
 */
export class InstanceConfigurationProxy extends MementoProxy {
	get instances(): InstanceConfiguration[] {
		return this.getItemOrDefault("cody.toolkit.core.connector.instances", []);
	}
	/**
	 * AVOID USING. Use addInstance and removeInstance instead.
	 */
	set instances(value: InstanceConfiguration[]) {
		this.setItem("cody.toolkit.core.connector.instances", value ?? []);
	}

	get activeInstance(): InstanceConfiguration | undefined {
		return this.getItem("cody.toolkit.core.connector.activeInstance");
	}
	set activeInstance(value: InstanceConfiguration | undefined) {
		this.setItem("cody.toolkit.core.connector.activeInstance", value);
	}

	addInstance(config: InstanceConfiguration) {
		if (config == null) return;
		if (this.instances.some((i) => i.instanceId.toLowerCase() === config.instanceId.toLowerCase())) {
			throw new Error("An instance with the name " + config.instanceId + " already exists");
		}
		this.instances = [...this.instances, config];
	}

	removeInstance(instanceId: string) {
		if (instanceId == null) return;
		this.instances = this.instances.filter((i) => i.instanceId.toLowerCase() !== instanceId.toLowerCase());
	}
}

type BaseInstanceConfiguration = {
	instanceId: string;
	useCredentialsFile: boolean;
};

export type ManualInstanceConfiguration = BaseInstanceConfiguration & {
	discoveryServiceUrl: string;
	userName: string;
	useCredentialsFile: false;
};

export type CredentialsFileInstanceConfiguration = BaseInstanceConfiguration & {
	credentialsFilePath: string;
	useCredentialsFile: true;
};

export type InstanceConfiguration = ManualInstanceConfiguration | CredentialsFileInstanceConfiguration;

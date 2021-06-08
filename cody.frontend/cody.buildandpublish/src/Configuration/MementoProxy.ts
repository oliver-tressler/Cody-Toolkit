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

export type BuildAndPublishFileConfiguration = {
	/**
	 * The local path to the original file.
	 */
	inputFile?: string;
	/**
	 * For buildable web resources, this will be the bundle file, which will have the location relative to the output
	 * path as its name. For non-buildable web resources, this will just be the name of the resource.
	 */
	outputFile?: string;
};

/**
 * Store instance configurations in the workspace memento object.
 */
export class BuildAndPublishFileConfigurationProxy extends MementoProxy {
	getFileConfiguration(filePath: string) {
		return this.getItem<BuildAndPublishFileConfiguration>(filePath.toLocaleLowerCase());
	}
	setFileConfiguration(filePath: string, fileConfiguration: BuildAndPublishFileConfiguration | undefined) {
		this.setItem(filePath.toLocaleLowerCase(), fileConfiguration);
	}
}

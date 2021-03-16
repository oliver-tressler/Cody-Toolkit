import { Memento } from "vscode";
import { PublisherInfo } from "../Api/Api";

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
export class PreferredPublisherProxy extends MementoProxy {
	getPreferredPublisherId(instanceId: string, organizationUniqueName: string): string | undefined {
		return this.getItem(`cody.toolkit.solutionmanager.preferredPublisher.${instanceId}.${organizationUniqueName}`);
	}
	setPreferredPublisher(instanceId: string, organizationUniqueName: string, publisher: PublisherInfo) {
		this.setItem(
			`cody.toolkit.solutionmanager.preferredPublisher.${instanceId}.${organizationUniqueName}`,
			publisher.Id
		);
	}
}

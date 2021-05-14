import * as api from "./Api/connectionApi";
import { OrganizationConfiguration } from "./Api/connectionApi";
import { InstanceConfiguration, InstanceConfigurationProxy } from "./Configuration/MementoProxy";
import {
	requestInfoForCredentialsFileInstance,
	requestInfoForUsernameAndPasswordInstance,
} from "./Utils/userInteraction";

/**
 * Create and store a new instance configuration via a memento proxy.
 * @param port
 * @param config Memento proxy
 * @param useCredentialsFile Determines the authentication type
 * @param password Required if not using a credentials file
 */
export async function registerInstance(
	port: number,
	config: InstanceConfigurationProxy,
	useCredentialsFile?: boolean
): Promise<{
	instance: InstanceConfiguration;
	availableOrganizations: OrganizationConfiguration[];
	password?: string;
}> {
	if (useCredentialsFile === true) {
		return await registerNewCredentialsFileInstance(port, config);
	} else {
		return await registerNewUsernameAndPasswordInstance(port, config);
	}
}

async function registerNewUsernameAndPasswordInstance(port: number, config: InstanceConfigurationProxy) {
	const [instance, password] = await requestInfoForUsernameAndPasswordInstance(port);
	config.addInstance(instance);
	const availableOrganizationsResponse = await api.fetchOrganizationsForInstance(port, instance, password);
	// Return password so that it can be reused across one authentication process.
	return { instance, availableOrganizations: availableOrganizationsResponse.data, password };
}

async function registerNewCredentialsFileInstance(port: number, config: InstanceConfigurationProxy) {
	const instance = await requestInfoForCredentialsFileInstance(port, config);
	config.addInstance(instance);
	const availableOrganizationsResponse = await api.fetchOrganizationsForInstance(
		port,
		instance,
		config.getCredentialsFileKey(instance.instanceId)
	);
	return { instance, availableOrganizations: availableOrganizationsResponse.data };
}

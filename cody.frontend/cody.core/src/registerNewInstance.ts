import * as api from "./Api/connectionApi";
import { InstanceConfiguration, InstanceConfigurationProxy } from "./Configuration/MementoProxy";
import {
    requestInfoForCredentialsFileInstance,
    requestInfoForUsernameAndPasswordInstance
} from "./Utils/userInteraction";

/**
 * Create and store a new instance configuration via a memento proxy.
 * @param port
 * @param config Memento proxy
 * @param useCredentialsFile Determines the authentication type
 * @param password Required if not using a credentials file
 */
export async function registerInstance(
    config: InstanceConfigurationProxy,
    useCredentialsFile?: boolean
): Promise<{
    instance: InstanceConfiguration;
    password?: string;
}> {
    if (useCredentialsFile === true) {
        return await registerNewCredentialsFileInstance(config);
    } else {
        return await registerNewUsernameAndPasswordInstance(config);
    }
}

async function registerNewUsernameAndPasswordInstance(config: InstanceConfigurationProxy) {
    const [instance, password] = await requestInfoForUsernameAndPasswordInstance();
    const isValidConfigurationResponse = await api.isValidDiscoveryServiceConfiguration(instance, password);
    if (isValidConfigurationResponse.data !== true) throw new Error("Connection to instance discovery service failed.");
    config.addInstance(instance);
    // Return password so that it can be reused across one authentication process.
    return { instance, availableOrganizations: password };
}

async function registerNewCredentialsFileInstance(config: InstanceConfigurationProxy) {
    const [instance, key] = await requestInfoForCredentialsFileInstance(config);
    const isValidConfigurationResponse = await api.isValidDiscoveryServiceConfiguration(
        instance,
        config.getCredentialsFileKey(instance.instanceId)
    );
	// Add and remove so that the credentials file is not saved for invalid instances
	config.addInstance(instance);
    if (isValidConfigurationResponse.data !== true) {
		config.removeInstance(instance.instanceId);
        throw new Error("Connection to instance discovery service failed.");
    }
    return { instance };
}

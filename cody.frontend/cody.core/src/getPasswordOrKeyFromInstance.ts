import { InstanceConfiguration, InstanceConfigurationProxy } from "./Configuration/MementoProxy";
import { requestPassword } from "./Utils/userInteraction";

export async function getPasswordOrKeyFromInstance(config: InstanceConfigurationProxy, instance: InstanceConfiguration) {
    const passwordOrKey = instance.useCredentialsFile
        ? config.getCredentialsFileKey(instance.instanceId)
        : await requestPassword(instance.instanceId);
    return passwordOrKey;
}

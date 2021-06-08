import { join } from "path";
import * as vscode from "vscode";
import * as api from "../Api/connectionApi";
import { InstanceConfigurationProxy } from "../Configuration/MementoProxy";
import { requestDiscoUrl, requestPassword, requestUserName } from "./userInteraction";

export async function createCredentialsFile(instanceId: string, config: InstanceConfigurationProxy) {
    const userName = await requestUserName(instanceId);
    const password = await requestPassword(instanceId);
    const discoveryServiceUrl = await requestDiscoUrl();
    const file = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        title: "Choose a Location for the Credentials File",
        openLabel: "Choose",
    });
    if (file?.length !== 1) throw new Error("No credentials file location provided");
    const credentialsFilePath = join(file[0].fsPath, instanceId + ".codycon");
    await api.createCredentialsFile({
        DiscoveryServiceUrl: discoveryServiceUrl,
        CredentialsFilePath: credentialsFilePath,
        UserName: userName,
        Password: password,
        Key: config.getCredentialsFileKey(instanceId),
    });
    return credentialsFilePath;
}

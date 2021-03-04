import * as vscode from "vscode";
import { addWebResourceToSolution as addWebResourceToSolutionRequest } from "./Api/Api";
import { chooseSolution, chooseWebResources, Progress } from "./Utils/userInteraction";
import { getConnectionState } from "./Utils/connection";

export async function addWebResourceToSolution() {
	const activeOrganization = (await getConnectionState())?.activeOrganization;
	if (activeOrganization == null) {
		vscode.window.showErrorMessage("Not Authenticated");
		return;
	}
	await vscode.window.withProgress(
		{ location: vscode.ProgressLocation.Notification, title: "Add WebResource to Solution", cancellable: false },
		async (progress: Progress) => {
			const solution = await chooseSolution(progress, activeOrganization.UniqueName);
			const chosenWebResources = await chooseWebResources(progress, activeOrganization.UniqueName);
			for (const wr of chosenWebResources) {
				progress.report({ message: `Adding ${wr.Name} to solution ${solution.UniqueName}` });
				try {
					await addWebResourceToSolutionRequest(activeOrganization.UniqueName, solution.UniqueName, wr.Id);
				} catch (e) {
					vscode.window.showErrorMessage(
						`Unable to add WebResource ${wr.Name} to Solution ${solution.UniqueName} \
						${e.message}`
					);
				}
			}
		}
	);
}

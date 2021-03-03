import * as vscode from "vscode";
import { createSolution } from "./Api/Api";
import { getSolutionName, getVersion, getPublisher, getDescription, Progress } from "./Utils/userInteraction";
import { getActiveOrganization } from "./Utils/connection";

export async function createNewSolution() {
	const activeOrganization = await getActiveOrganization();
	if (activeOrganization == null) {
		vscode.window.showErrorMessage("Not Authenticated");
		return;
	}
	vscode.window.withProgress(
		{ location: vscode.ProgressLocation.Notification, title: "Create Solution", cancellable: false },
		async (progress: Progress) => {
			try {
				progress.report({ message: "Awaiting User Input" });
				const solutionName = await getSolutionName();
				progress.report({ message: "Awaiting User Input" });
				const version = await getVersion();
				const publisher = await getPublisher(progress, activeOrganization.UniqueName);
				progress.report({ message: "Awaiting User Input" });
				const description = await getDescription();
				progress.report({ message: "Creating Solution ..." });
				const result = await createSolution(
					activeOrganization.UniqueName,
					solutionName,
					version,
					publisher,
					description
				);
				vscode.window.showInformationMessage(`Solution ${result.data.UniqueName} has been created.`);
			} catch (e) {
				vscode.window.showErrorMessage(e.message);
			}
		}
	);
}

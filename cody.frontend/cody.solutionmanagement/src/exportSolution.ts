import * as vscode from "vscode";
import { getConnectionState } from "./Utils/connection";
import * as api from "./Api/Api";
import { chooseSolution, Progress } from "./Utils/userInteraction";
import { Configuration } from "./Configuration/ConfigurationProxy";
export async function exportSolution() {
    const connectionState = await getConnectionState();
	const activeOrganization = connectionState?.activeOrganization;
	if (activeOrganization == null) {
		vscode.window.showErrorMessage("Not Authenticated");
		return;
	}
    vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: "Export Solution", cancellable: false },
        async (progress: Progress) => {
            try {
				progress.report({ message: "Awaiting User Input" });
                const solution = await chooseSolution(progress, activeOrganization.UniqueName);
                await api.exportSolution(activeOrganization.UniqueName, solution.UniqueName, Configuration.exportedSolutionPath)
            }
            catch(e) {
				vscode.window.showErrorMessage(e.message);
            }
        }
    );
}

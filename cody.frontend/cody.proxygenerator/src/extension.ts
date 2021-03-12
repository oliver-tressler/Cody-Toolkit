import * as vscode from "vscode";
import { GenerateProxyCommandProvider } from "./sharedTypings";
import { tsCommandProvider } from "./tsProxyGenerator";
import axios, { AxiosError } from "axios";

/**
 * Basic error handler that tries to provide Server and Extension exception messages to the user
 * @param e Exception
 */
function errorHandler(e: any) {
	let errText: string | undefined = undefined;
	if (axios.isAxiosError(e)) {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		const axiErr: AxiosError<{ Message: string; ExceptionMessage?: string }> = e;
		if (axiErr.response?.data.ExceptionMessage || axiErr.response?.data.Message) {
			errText = axiErr.response.data.ExceptionMessage ?? axiErr.response.data.Message;
		}
	}
	if (!errText && "message" in e && typeof e.message === "string") {
		errText = e.message;
	}
	if (errText) {
		console.error(e);
		vscode.window.showErrorMessage(errText);
	}
}

const commandProviders: GenerateProxyCommandProvider[] = [tsCommandProvider];
export function activate(context: vscode.ExtensionContext) {
	for (const provider of commandProviders) {
		for (const command in provider.commands) {
			context.subscriptions.push(
				vscode.commands.registerCommand(
					`cody.toolkit.proxyGenerator.${provider.languageAbbreviation}.${command}`,
					() => provider.commands[command](context).catch(errorHandler)
				)
			);
		}
	}
}

export function deactivate() {}

import axios, { AxiosError } from "axios";
import * as vscode from "vscode";

/**
 * Basic pass through error handler that tries to provide Server and Extension exception messages to the user
 * @param e Exception
 */
export function errorHandler(e: any) {
	let errText: string | undefined = undefined;
	if (axios.isAxiosError(e)) {
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
	throw e;
}

import { v4 } from "uuid";
import { WebviewPanel } from "vscode";

/**
 * Basically a wrapper around VS Codes Webview <-> Extension Interface to
 * easily do request/response and message sending
 */
export class WebviewInterface {
	private messageHandlers: {
		[command: string]: {
			id: string;
			handler: (message: WebviewRequest) => any;
		}[];
	};
	constructor(private panel: WebviewPanel) {
		this.messageHandlers = {};
		this.panel.webview.onDidReceiveMessage((message) => {
			if (message.command && this.messageHandlers[message.command] != null) {
				for (const handler of this.messageHandlers[message.command]) {
					handler.handler({ command: message.comand, id: message.id, payload: message.payload });
				}
			}
		});
	}

	sendMessage<T>(command: string, payload: T) {
		this.panel.webview.postMessage({ command, id: v4(), payload: payload });
	}

	on<T>(command: string, handlerId: string, handler: (message: T) => Promise<any>) {
		if (this.messageHandlers[command] == null) {
			this.messageHandlers[command] = [];
		}
		this.messageHandlers[command].push({
			id: handlerId,
			handler: (message) => {
				handler(message.payload as T)
					.then((response) => {
						this.panel.webview.postMessage({
							command: message.command,
							id: message.id,
							success: true,
							payload: response,
						});
					})
					.catch((error) => {
						this.panel.webview.postMessage({
							command: message.command,
							id: message.id,
							success: false,
							payload: error,
						});
					});
			},
		});
	}
}

export type WebviewRequest = {
	id: string;
	command: string;
	payload: any;
};

export class AsyncCompletionSource<T> {
	awaiter: Promise<T>;
	setResult!: (result: any) => any;
	setError!: (e: Error) => any;
	constructor() {
		this.awaiter = new Promise((resolve, reject) => {
			this.setResult = function (result) {
				resolve(result);
			};
			this.setError = function (error) {
				reject(error);
			};
		});
	}
}

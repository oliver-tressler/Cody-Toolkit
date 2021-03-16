import { WebviewPanel } from "vscode";

export class WebviewExtensionInterface {
	private pendingRequests: { [id: string]: AsyncCompletionSource<any> };
	private messageHandlers: {
		[command: string]: {
			id: string;
			handler: (message: WebviewRequest) => any;
		}[];
	};
	constructor(private panel: WebviewPanel) {
		this.pendingRequests = {};
		this.messageHandlers = {};
		this.panel.webview.onDidReceiveMessage((message) => {
			if (this.pendingRequests[message.id] != null) {
				const completionSource = this.pendingRequests[message.id];
				completionSource.setResult(message);
			} else if (message.command && this.messageHandlers[message.command] != null) {
				for (const handler of this.messageHandlers[message.command]) {
					handler.handler({ command: message.comand, id: message.id, payload: message.payload });
				}
			}
		});
	}

	sendRequest(request: WebviewRequest) {
		const requestObject = { id: request.id, command: request.command, payload: request.payload };
		this.panel.webview.postMessage(requestObject);
		const completionSource = new AsyncCompletionSource();
		this.pendingRequests[requestObject.id] = completionSource;
		return completionSource.awaiter;
	}

	sendMessage(command: string, id: string, payload: any) {
		this.panel.webview.postMessage({ command, id, payload: payload });
	}

	on(command: string, handlerId: string, handler: (message: WebviewRequest) => Promise<any>) {
		if (this.messageHandlers[command] == null) {
			this.messageHandlers[command] = [];
		}
		this.messageHandlers[command].push({
			id: handlerId,
			handler: (message) => {
				handler(message)
					.then((response) => {
						this.panel.webview.postMessage({
							id: message.id,
							success: true,
							payload: response,
						});
					})
					.catch((error) => {
						this.panel.webview.postMessage({
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

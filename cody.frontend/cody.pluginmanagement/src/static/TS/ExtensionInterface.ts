declare const acquireVsCodeApi: () => any;
export const api: {
	postMessage: (requestData: any) => void;
	getState: () => any;
	setState: (state: any) => void;
} = acquireVsCodeApi();

type Message = {
	id: string;
	command: string;
	payload: any;
};

const pendingRequests: { [id: string]: AsyncCompletionSource<any> } = {};
const messageHandlers: {
	[command: string]: {
		handler: (message: { command: string; id: string; payload: any }) => any;
	}[];
} = {};

function randomString() {
	return Math.floor(Math.random() * Math.pow(10, 16))
		.toString(36)
		.substring(0, 10);
}

export function sendRequest<RequestData, Response>(command: string, payload: RequestData): Promise<Response> {
	const requestObject = { id: randomString(), command, payload };
	api.postMessage(requestObject);
	const completionSource = new AsyncCompletionSource<Response>();
	pendingRequests[requestObject.id] = completionSource;
	return completionSource.awaiter;
}

export function onMessage(
	command: string,
	handler: (message: { command: string; id: string; payload: any }) => Promise<any>
) {
	if (messageHandlers[command] == null) {
		messageHandlers[command] = [];
	}
	messageHandlers[command].push({
		handler: (message) => {
			handler(message)
				.then((response) => {
					api.postMessage({
						id: message.id,
						success: true,
						payload: response,
					});
				})
				.catch((error) => {
					api.postMessage({
						id: message.id,
						success: false,
						payload: error,
					});
				});
		},
	});
}

window.addEventListener("message", (evt) => {
	const message: Message = evt.data;
	if (pendingRequests[message.id] != null) {
		const completionSource = pendingRequests[message.id];
		if (message.payload instanceof Error) {
			completionSource.setError(message.payload);
		} else {
			completionSource.setResult(message.payload);
		}
	} else if (message.command && messageHandlers[message.command] != null) {
		for (const handler of messageHandlers[message.command]) {
			handler.handler(message);
		}
	}
});

class AsyncCompletionSource<T> {
	awaiter: Promise<T>;
	setResult!: (result: any) => any;
	setError!: (e: Error) => any;
	constructor() {
		this.awaiter = new Promise((resolve, reject) => {
			this.setResult = function (result: T) {
				resolve(result);
			};
			this.setError = function (error: Error) {
				reject(error);
			};
		});
	}
}

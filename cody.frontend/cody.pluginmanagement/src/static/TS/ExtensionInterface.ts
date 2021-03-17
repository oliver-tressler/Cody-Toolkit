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
	// taken from https://github.com/30-seconds/30-seconds-of-code/blob/master/snippets/UUIDGeneratorBrowser.md
	return [1e7, 1e3, 4e3, 8e3, 1e11].join("-").replace(/[018]/g, (c: string) => {
		const val = parseInt(c);
		return (val ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (val / 4)))).toString(16);
	});
}

export function sendRequest<RequestData, Response>(command: string, payload: RequestData): Promise<Response> {
	const requestObject = { id: randomString(), command, payload };
	api.postMessage(requestObject);
	const completionSource = new AsyncCompletionSource<Response>();
	pendingRequests[requestObject.id] = completionSource;
	return completionSource.awaiter;
}

export function onMessage<T>(command: string, handler: (message: T) => void | Promise<void>) {
	if (messageHandlers[command] == null) {
		messageHandlers[command] = [];
	}
	messageHandlers[command].push({
		handler: (message) => {
			handler(message.payload);
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

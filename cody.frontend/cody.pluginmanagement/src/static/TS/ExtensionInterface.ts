type Message = {
	id: string;
	command: string;
	payload: any;
};

export class ExtensionInterface {
	private pendingRequests: { [id: string]: AsyncCompletionSource<any> };
	private messageHandlers: {
		[command: string]: {
			id: string;
			handler: (message: { command: string; id: string; payload: any }) => any;
		}[];
	};
	constructor(private api) {
		this.pendingRequests = {};
		this.messageHandlers = {};
		window.addEventListener("message", (evt) => {
			const message: Message = evt.data;
			if (this.pendingRequests[message.id] != null) {
				const completionSource = this.pendingRequests[message.id];
				if (message.payload instanceof Error) completionSource.setError(message.payload);
				else completionSource.setResult(message.payload);
			} else if (message.command && this.messageHandlers[message.command] != null) {
				for (const handler of this.messageHandlers[message.command]) {
					handler.handler(message);
				}
			}
		});
	}

	async sendRequest<T>(request: Message): Promise<T> {
		const requestObject = { id: request.id, command: request.command, payload: request.payload };
		this.api.postMessage(requestObject);
		const completionSource = new AsyncCompletionSource();
		this.pendingRequests[requestObject.id] = completionSource;
		return (await completionSource.awaiter) as T;
	}

	on(
		command: string,
		handlerId: string,
		handler: (message: { command: string; id: string; payload: any }) => Promise<any>
	) {
		if (this.messageHandlers[command] == null) this.messageHandlers[command] = [];
		this.messageHandlers[command].push({
			id: handlerId,
			handler: (message) => {
				handler(message)
					.then((response) => {
						this.api.postMessage({
							id: message.id,
							success: true,
							payload: response,
						});
					})
					.catch((error) => {
						this.api.postMessage({
							id: message.id,
							success: false,
							payload: error,
						});
					});
			},
		});
	}
}

export class AsyncCompletionSource<T> {
	awaiter: Promise<T>;
	setResult: (result: any) => any;
	setError: (e: Error) => any;
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

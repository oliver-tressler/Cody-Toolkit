import * as vsc from "vscode";
import { IServerMessageObserver } from "./ServerConnector";


export class DefaultLogger implements IServerMessageObserver {
	private outputChannels: { [channelId: string]: vsc.OutputChannel; };
	constructor(public id: string) {
		this.outputChannels = {};
	}
	onServerMessage(message: string) {
		const parsedMessage = this.parseServerMessage(message);
		if (parsedMessage == null)
			return;
		const { message: messageData, channel } = parsedMessage;
		this.logMessage(channel, "Server", messageData);
	}

	logClientMessage(channelId: string, message: string) {
		this.logMessage(channelId, "Extension", message);
	}

	private logMessage(channelId: string, origin: "Extension" | "Server", message: string) {
		if (this.outputChannels[channelId] == null)
			this.outputChannels[channelId] = vsc.window.createOutputChannel(channelId);
		this.outputChannels[channelId].appendLine(`[${this.generateCurrentTimeString()} - ${origin}] ${message}`);
	}

	generateCurrentTimeString() {
		return `${new Date().toLocaleTimeString()}`;
	}

	private parseServerMessage(message: string) {
		const closingBracketIdx = message.indexOf("}", 10);
		if (closingBracketIdx < 0)
			return;
		const channel = message.slice(9, closingBracketIdx);
		return { channel, message: message.slice(closingBracketIdx + 1) };
	}
}

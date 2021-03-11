import * as vsc from "vscode";
export class CustomBuildTaskTerminal implements vsc.Pseudoterminal {
	private writeEmitter = new vsc.EventEmitter<string>();
	onDidWrite: vsc.Event<string> = this.writeEmitter.event;
	private closeEmitter = new vsc.EventEmitter<void>();
	onDidClose?: vsc.Event<void> = this.closeEmitter.event;
	private terminal: vsc.Terminal | undefined;

	constructor(private onOpen: () => Promise<void>) {
		this.terminal = undefined;
	}
	error(message?: string): void {
		this.writeLine("ERR:" + message?.toString());
	}
	warn(message?: string): void {
		this.writeLine("WARN:" + message?.toString());
	}
	info(message?: string): void {
		this.writeLine("INFO:" + message);
	}

	writeLine(message?: string): void {
		if (message == null) return;
		if (message.length > 200) {
			for (let i = 0; i < Math.ceil(message.length / 200); i++) {
				this.writeLine(message.substring(i * 200, (i + 1) * 200));
			}
			return;
		}
		this.writeEmitter.fire(message + "\r\n");
	}

	async open(): Promise<void> {
		try {
			this.terminal = vsc.window.activeTerminal;
			await this.onOpen();
		} catch {
			// Do nothing
		}
		this.close();
	}

	close(): void {
		// this.terminal?.hide();
		if (this.terminal?.exitStatus == null) {
			this.terminal?.dispose();
			this.closeEmitter.fire();
		}
	}
}

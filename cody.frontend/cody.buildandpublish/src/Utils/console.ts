import * as vscode from "vscode";
/**
 * A minimal Pseudoterminal
 */
export class CustomBuildTaskTerminal implements vscode.Pseudoterminal {
	private writeEmitter = new vscode.EventEmitter<string>();
	onDidWrite: vscode.Event<string> = this.writeEmitter.event;
	private closeEmitter = new vscode.EventEmitter<void>();
	onDidClose?: vscode.Event<void> = this.closeEmitter.event;

	constructor(private onOpen: () => Promise<any>) {
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

	writeLine(message?: string) {
		if (message == null) return;
		this.writeEmitter.fire(message + "\r\n");
	}

	async open(): Promise<void> {
		try {
			await this.onOpen();
		} catch {
			// Do nothing
		}
		this.close();
	}

	close(): void {
		this.closeEmitter.fire();
	}
}

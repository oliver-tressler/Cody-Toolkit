import * as vscode from "vscode";
import { PluginBrowserProvider } from "./PluginBrowserProvider";
import { PluginEditorProvider } from "./PluginEditorProvider";

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(new PluginBrowserProvider(context));
	new PluginEditorProvider(context);
}

// this method is called when your extension is deactivated
export function deactivate() {}

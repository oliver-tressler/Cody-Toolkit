import * as vscode from "vscode";
export type GenerateProxyCommandProvider = {
	languageAbbreviation: "ts" | "cs";
	commands: {
		[key: string]: (context: vscode.ExtensionContext) => Promise<void>;
	};
};

export type AvailableEntity = {
	LogicalName: string;
	DisplayName?: string;
	Description?: string;
};

export type AvailableAction = {
	Name: string;
	DisplayName: string;
	PrimaryEntityName: string;
};

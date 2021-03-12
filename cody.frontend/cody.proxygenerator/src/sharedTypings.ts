import * as vscode from "vscode";
export type GenerateProxyCommandProvider = {
	languageAbbreviation: "ts";
	commands: {
		[key: string]: (context: vscode.ExtensionContext) => Promise<void>;
	};
};

export type AvailableEntity = {
	LogicalName: string;
	DisplayName?: string;
	Description?: string;
};

export enum eLanguage {
	Typescript
}
import * as fs from "fs";
import * as path from "path";
import { BuildInfo } from "./build";
import { Configuration } from "./Configuration/ConfigurationProxy";

function match(buildInfo: BuildInfo) {
	return `regex:(?insx).*${buildInfo.fileConfiguration.output.outputFile.replace(/\./g, "\\.")}(?'map'\\.map)?`;
}

function action(buildInfo: BuildInfo) {
	return `${buildInfo.fileConfiguration.output.absoluteOutputFile!}\${map}`;
}

function responseRule(match: string, action: string, enabled: boolean) {
	return `<ResponseRule
		Match="${match}"
		Action="${action}"
		Enabled="${enabled}"
	/>`;
}

function fiddlerRuleWrapper(responseRule: string) {
	return `<?xml version="1.0" encoding="utf-8"?>
        <AutoResponder FiddlerVersion="5.0.20194.41348">
          <State Enabled="true" Fallthrough="true" UseLatency="false">
            ${responseRule}
          </State>
        </AutoResponder>`;
}

function createFiddlerRuleFile(buildInfo: BuildInfo, rule: string) {
	const ruleFolder = Configuration.fiddlerRuleFolder
		? path.normalize(Configuration.fiddlerRuleFolder)
		: path.join(buildInfo.directories.outDir!, path.dirname(buildInfo.fileConfiguration.output.relativeOutputFile));
	fs.writeFileSync(
		path.join(ruleFolder, path.parse(buildInfo.fileConfiguration.output.relativeOutputFile).name + ".fiddler.farx"),
		rule,
		{
			encoding: "utf8",
		}
	);
}

/**
 * Creates a fiddler rule file next to the output bundle or in the folder specified in the configuration.
 * Fiddler rule will match bundle file and source map.
 */
export function generateFiddlerRule(buildInfo: BuildInfo) {
	createFiddlerRuleFile(buildInfo, fiddlerRuleWrapper(responseRule(match(buildInfo), action(buildInfo), true)));
}

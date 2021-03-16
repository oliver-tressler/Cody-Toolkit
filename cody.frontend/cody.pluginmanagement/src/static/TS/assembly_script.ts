import { api, sendRequest } from "./ExtensionInterface";

type AssemblyFileUpdateRequest = {
	fileType: string;
	path: string;
};

type AssemblyFileUpdateResponse = {
	path: string;
	metadata: {
		AssemblyName: string;
		Version: string;
		Culture: string;
		PublicKeyToken: string;
		DetectedPluginTypes: { Name: string; FullName: string }[];
	};
};

type PostAssemblyRequest = {
	IsSandboxed: boolean;
	DeploymentMode: number;
	FilePath: string;
};
type PostAssemblyResponse = { AssemblyName: string; Id: string };

type State = {
	name: string;
	sandboxed: boolean;
	location: string;
	deployment: string;
	metadata: {
		name: string;
		version: string;
		culture: string;
		key: string;
	};
};

const form = document.getElementById("assembly_form") as HTMLFormElement;
const assemblyHeading = document.getElementById("heading_assembly_name") as HTMLElement;
const assemblyFileChooser = document.getElementById("input_assembly_file_chooser") as HTMLInputElement;
const assemblyNameElement = document.getElementById("input_assembly_name") as HTMLInputElement;
const assemblyMetadataNameElement = document.getElementById("input_assembly_metadata_name") as HTMLInputElement;
const assemblyMetadataVersionElement = document.getElementById("input_assembly_metadata_version") as HTMLInputElement;
const assemblyMetadataCultureElement = document.getElementById("input_assembly_metadata_culture") as HTMLInputElement;
const assemblyMetadataKeyElement = document.getElementById("input_assembly_metadata_key") as HTMLInputElement;
const isSandboxedElement = document.getElementById("input_assembly_sandboxed") as HTMLInputElement;
const deploymentModeElement = document.getElementById("input_assembly_deployment") as HTMLSelectElement;
const assemblyLocationElement = document.getElementById("input_assembly_file_location") as HTMLInputElement;
const submitButton = document.getElementById("input_assembly_submit");

const state: State = api.getState();
if (state) {
	assemblyLocationElement.value = state.location;
	assemblyNameElement.value = state.name;
	isSandboxedElement.checked = state.sandboxed;
	deploymentModeElement.value = state.deployment;
	assemblyMetadataNameElement.value = state.metadata.name;
	assemblyMetadataVersionElement.value = state.metadata.version;
	assemblyMetadataCultureElement.value = state.metadata.culture;
	assemblyMetadataKeyElement.value = state.metadata.key;
	assemblyHeading.textContent = state.name;
}

export async function updateFileName(path: string = "") {
	const response = await sendRequest<AssemblyFileUpdateRequest, AssemblyFileUpdateResponse>("plugineditor_pickfile", {
		fileType: "dll",
		path: path,
	});
	assemblyLocationElement.value = response.path ?? "";
	if (!response.path) {
		persistState();
		return;
	}
	assemblyNameElement.value = response.metadata.AssemblyName;
	assemblyMetadataNameElement.value = [
		...new Set([
			assemblyMetadataNameElement.value.replace(new RegExp(/\s+🡲 .+/), ""),
			response.metadata?.AssemblyName ?? "",
		]),
	]
		.filter((val) => !!val)
		.join(" 🡲 ");
	assemblyMetadataVersionElement.value = [
		...new Set([
			assemblyMetadataVersionElement.value.replace(new RegExp(/\s+🡲 .+/), ""),
			response.metadata?.Version ?? "",
		]),
	]
		.filter((val) => !!val)
		.join(" 🡲 ");
	assemblyMetadataCultureElement.value = [
		...new Set([
			assemblyMetadataCultureElement.value.replace(new RegExp(/\s+🡲 .+/), ""),
			response.metadata?.Culture ?? "",
		]),
	]
		.filter((val) => !!val)
		.join(" 🡲 ");
	assemblyMetadataKeyElement.value = [
		...new Set([
			assemblyMetadataKeyElement.value.replace(new RegExp(/\s+🡲 .+/), ""),
			response.metadata?.PublicKeyToken ?? "",
		]),
	]
		.filter((val) => !!val)
		.join(" 🡲 ");
	persistState();
	const remotePlugins = Array.from(document.querySelectorAll<HTMLParagraphElement>("#plugin_types p"));
	remotePlugins.forEach((plugin) => {
		if (plugin.classList.contains("added")) {
			plugin.remove();
		}
		plugin.classList.remove("deleted");
	});
	const localPlugins = response.metadata.DetectedPluginTypes;
	// Check which are missing
	remotePlugins
		.filter((node) => !localPlugins.some((plugin) => plugin.Name && plugin.Name === node.textContent?.trim()))
		.forEach((node) => {
			for (let i = 0; i < node.childNodes.length; i++) {
				if (node.childNodes[i].nodeType !== Node.TEXT_NODE) {
					node.removeChild(node.childNodes[i--]);
				}
			}
			node.classList.remove("added");
			node.classList.add("deleted");
		});
	// Check which will be added
	localPlugins
		.filter((plugin) => !remotePlugins.some((node) => plugin.Name && node.textContent?.trim() === plugin.Name))
		.sort()
		.forEach((missingPlugin) => {
			const p = document.createElement("p");
			p.textContent = missingPlugin.Name;
			p.classList.add("added");
			document.getElementById("plugin_types")?.prepend(p);
		});
}

export async function postData() {
	if (!form.reportValidity()) {
		return;
	}
	try {
		submitButton?.setAttribute("disabled", "true");
		const response = await sendRequest<PostAssemblyRequest, PostAssemblyResponse>("plugineditor_saveassembly", {
			IsSandboxed: isSandboxedElement.checked,
			DeploymentMode: parseInt(deploymentModeElement.value),
			FilePath: assemblyLocationElement.value,
		});
		assemblyHeading.textContent = response.AssemblyName;
	} finally {
		submitButton?.removeAttribute("disabled");
	}
}

assemblyFileChooser && (assemblyFileChooser.onclick = () => updateFileName());
submitButton && (submitButton.onclick = () => postData());
if (!!assemblyLocationElement?.value) {
	updateFileName(assemblyLocationElement?.value);
}
assemblyNameElement.onchange = persistState;
isSandboxedElement.onchange = persistState;
deploymentModeElement.onchange = persistState;
assemblyLocationElement.onchange = persistState;
assemblyMetadataNameElement.onchange = persistState;
assemblyMetadataVersionElement.onchange = persistState;
assemblyMetadataKeyElement.onchange = persistState;
assemblyMetadataCultureElement.onchange = persistState;

function persistState() {
	const state: State = {
		name: assemblyNameElement.value,
		sandboxed: isSandboxedElement.checked,
		location: assemblyLocationElement.value,
		deployment: deploymentModeElement.value,
		metadata: {
			name: assemblyMetadataNameElement.value,
			version: assemblyMetadataVersionElement.value,
			culture: assemblyMetadataCultureElement.value,
			key: assemblyMetadataKeyElement.value,
		},
	};
	api.setState(state);
}

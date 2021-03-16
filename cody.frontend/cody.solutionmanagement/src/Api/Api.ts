import axios from "axios";
import { Configuration } from "../Configuration/ConfigurationProxy";
export type PublisherInfo = {
	Id: string;
	Name: string;
	UniqueName: string;
	Description: string;
	Prefix: string;
};

export type SolutionInfo = {
	Id: string;
	Name: string;
	UniqueName: string;
	Version: string;
	Description: string;
	Publisher: { Id: string; Name: string };
};

export type AssemblyInfo = {
	Id: string;
	Name: string;
};

export type PluginInfo = {
	Id: string;
	Name: string;
	Steps: StepInfo[];
};

export type StepInfo = {
	Id: string;
	Name: string;
	MessageName: string;
	EntityName: string;
	Stage: string;
	AddedToSolution?: boolean;
};

export type WebResourceInfo = {
	Id: string;
	Name: string;
	DisplayName: string;
	Description: string;
	Type: string;
};

export function baseUrl() {
	return `http://localhost:${Configuration.backendServerPort}/api/SolutionManager/`;
}

export function retrievePublishers(organization: string) {
	return axios.get<PublisherInfo[]>(`${baseUrl()}${organization}/publishers`);
}

export function retrieveSolutions(organization: string) {
	return axios.get<SolutionInfo[]>(`${baseUrl()}${organization}/solutions`);
}

export function retrieveWebResources(organization: string) {
	return axios.get<WebResourceInfo[]>(`${baseUrl()}${organization}/webresources`);
}

export function retrieveAssemblies(organization: string) {
	return axios.get<AssemblyInfo[]>(`${baseUrl()}${organization}/assemblies`);
}

/**
 * Retrieve all steps that belong to a specificied assembly grouped by their associated plugin
 * @param organization Unique name of the Dynamics CRM Organization
 * @param assemblyId Id of the assembly that the steps belong to
 */
export function retrieveAssemblySteps(organization: string, assemblyId: string) {
	return axios.get<PluginInfo[]>(`${baseUrl()}${organization}/assembly/${assemblyId}/steps`);
}

export function addAssemblyToSolution(organization: string, assemblyId: string, solutionUniqueName: string) {
	return axios.post<void>(`${baseUrl()}${organization}/assembly/${assemblyId}/addToSolution/${solutionUniqueName}`);
}

export function addStepToSolution(organization: string, solutionUniqueName: string, stepId: string) {
	return axios.post<void>(`${baseUrl()}${organization}/step/${stepId}/addToSolution/${solutionUniqueName}`);
}

export function addWebResourceToSolution(organization: string, solutionUniqueName: string, webResourceId: string) {
	return axios.post<void>(
		`${baseUrl()}${organization}/webresource/${webResourceId}/addToSolution/${solutionUniqueName}`
	);
}

export function createSolution(
	organization: string,
	solutionName: string,
	version: string,
	publisher: PublisherInfo,
	description?: string
) {
	return axios.post<SolutionInfo>(`${baseUrl()}${organization}/solutions/new`, {
		UniqueName: solutionName,
		Name: solutionName,
		Version: version,
		Description: description,
		Publisher: publisher,
	});
}

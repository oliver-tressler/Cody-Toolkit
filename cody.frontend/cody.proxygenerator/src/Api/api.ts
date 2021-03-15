import axios from "axios";
import { Configuration } from "../Configuration/ConfigurationProxy";
import { AvailableAction, AvailableEntity } from "../sharedTypings";

function baseUrl() {
	return `http://localhost:${Configuration.backendServerPort}/api/ProxyGenerator/`;
}

export function retrieveAvailableEntities(organization: string) {
	return axios.get<AvailableEntity[]>(`${baseUrl()}${organization}/availableEntities`);
}

type GenerateEntityProxiesRequestOptions = {
	organization: string;
	entitiyLogicalNames: string[];
	path: string;
	language: "ts";
	proxyNamespace?: string;
	globalEnums?: boolean;
};
export function generateEntityProxies(requestOptions: GenerateEntityProxiesRequestOptions) {
	const { language, organization, ...requestData } = requestOptions;
	return axios.post<void>(`${baseUrl()}${organization}/${language}/generateEntityProxies`, {
		EntityLogicalNames: requestData.entitiyLogicalNames,
		Path: requestData.path,
		ProxyNamespace: requestData.proxyNamespace,
		GlobalEnums: requestData.globalEnums,
	});
}

type GenerateActionProxiesRequestOptions = {
	organization: string;
	actionNames: string[];
	path: string;
	language: "ts";
	proxyNamespace?: string;
};
export function retrieveAvailableActions(organization: string) {
	return axios.get<AvailableAction[]>(`${baseUrl()}${organization}/availableActions`);
}
export function generateActionProxies(requestOptions: GenerateActionProxiesRequestOptions) {
	const { language, organization, ...requestData } = requestOptions;
	return axios.post<void>(`${baseUrl()}${organization}/${language}/generateActionProxies`, {
		ActionNames: requestData.actionNames,
		Path: requestData.path,
		ProxyNamespace: requestData.proxyNamespace,
	});
}

import axios from "axios";
import { Configuration } from "../Configuration/ConfigurationProxy";
import { AvailableEntity } from "../sharedTypings";

function baseUrl() {
	return `http://localhost:${Configuration.backendServerPort}/api/ProxyGenerator/`;
}

export function retrieveAvailableEntities(organization: string) {
	return axios.get<AvailableEntity[]>(`${baseUrl()}${organization}/availableEntities`);
}

type GenerateProxiesRequestOptions = {
	organization: string;
	entitiyLogicalNames: string[];
	path: string;
	language: "ts";
	proxyNamespace?: string;
	globalEnums?: boolean;
};
export function generateProxies(requestOptions: GenerateProxiesRequestOptions) {
	const { language, organization, ...requestData } = requestOptions;
	return axios.post<void>(`${baseUrl()}${organization}/${language}/generate`, {
		EntityLogicalNames: requestData.entitiyLogicalNames,
		Path: requestData.path,
		ProxyNamespace: requestData.proxyNamespace,
		GlobalEnums: requestData.globalEnums,
	});
}

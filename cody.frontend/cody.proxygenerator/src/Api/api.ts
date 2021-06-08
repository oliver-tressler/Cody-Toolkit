import axios from "axios";
import { Configuration } from "../Configuration/ConfigurationProxy";
import { AvailableAction, AvailableEntity } from "../sharedTypings";

function baseUrl() {
	return `http://localhost:${Configuration.backendServerPort}/api/ProxyGenerator/`;
}

export function retrieveAvailableEntities(organization: string) {
	return axios.get<AvailableEntity[]>(`${baseUrl()}${organization}/availableEntities`);
}

type BaseGenerateEntityProxiesRequestOptions = {
	organization: string;
	entitiyLogicalNames: string[];
	path: string;
	globalEnums?: boolean;
};
type TypeScriptEntityProxyRequestOptions = {
	language: "ts";
};

type CSharpEntityProxyRequestOptions = {
	language: "cs";
	mode: "XrmToolkit" | "CrmSvcUtil";
	proxyNamespace: string;
};
type GenerateEntityProxiesRequestOptions = BaseGenerateEntityProxiesRequestOptions &
	(CSharpEntityProxyRequestOptions | TypeScriptEntityProxyRequestOptions);

type GenerateProxiesBaseResponse = {
	CreatedNewFiles: boolean;
};
export function generateEntityProxies(requestOptions: GenerateEntityProxiesRequestOptions) {
	const { language, organization, entitiyLogicalNames, path, ...requestData } = requestOptions;
	return axios.post<GenerateProxiesBaseResponse>(`${baseUrl()}${organization}/${language}/generateEntityProxies`, {
		EntityLogicalNames: entitiyLogicalNames,
		Path: path,
		ProxyNamespace: requestOptions.language === "cs" ? requestOptions.proxyNamespace : undefined,
		GlobalEnums: requestData.globalEnums,
	});
}

type BaseGenerateActionProxiesRequestOptions = {
	organization: string;
	actionNames: string[];
	path: string;
};

type TypeScriptActionProxyRequestOptions = {
	language: "ts";
};

type CSharpActionProxyRequestOptions = {
	language: "cs";
	mode: "XrmToolkit" | "CrmSvcUtil";
	proxyNamespace: string;
};

type GenerateActionProxiesRequestOptions = BaseGenerateActionProxiesRequestOptions &
	(TypeScriptActionProxyRequestOptions | CSharpActionProxyRequestOptions);
export function retrieveAvailableActions(organization: string) {
	return axios.get<AvailableAction[]>(`${baseUrl()}${organization}/availableActions`);
}

export function generateActionProxies(requestOptions: GenerateActionProxiesRequestOptions) {
	const { language, organization, actionNames, path } = requestOptions;
	return axios.post<GenerateProxiesBaseResponse>(`${baseUrl()}${organization}/${language}/generateActionProxies`, {
		ActionNames: actionNames,
		Path: path,
		ProxyNamespace: requestOptions.language == "cs" ? requestOptions.proxyNamespace : undefined,
	});
}

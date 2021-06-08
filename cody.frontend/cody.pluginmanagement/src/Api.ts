import Axios from "axios";
import { Configuration } from "./Configuration/ConfigurationProxy";

export class Api {
	private static get baseUrl(): string {
		return `http://localhost:${Configuration.backendServerPort}/api/pluginbrowser/`;
	}

	static retrieveMessages(organization: string) {
		return Axios.get(`${this.baseUrl}availablemessages?organization=${organization}`);
	}

	static retrieveEntities(organization: string, messageId?: string) {
		let url = `${this.baseUrl}availableentities?organization=${organization}`;
		if (messageId) url += `&messageId=${messageId}`;
		return Axios.get(url);
	}

	static retrieveUsers(organization: string) {
		return Axios.get(`${this.baseUrl}availableusers?organization=${organization}`);
	}

	static retrieveAssemblyDetails(organization: string, assemblyId: string) {
		return Axios.get(`${this.baseUrl}assembly/${organization}/${assemblyId}`);
	}

	static retrieveAssemblyMetadata(path: string) {
		return Axios.get(`${this.baseUrl}assemblymetadata?path=${encodeURIComponent(path)}`);
	}

	static createAssembly(organization: string, payload: any) {
		return Axios.post(`${this.baseUrl}assembly/${organization}/new`, payload);
	}

	static updateAssemblyDetails(organization: string, assemblyId: string, data: any) {
		return Axios.post(`${this.baseUrl}assembly/${organization}/${assemblyId}`, data);
	}

	static deleteAssembly(organization: string, assemblyId: string) {
		return Axios.post(`${this.baseUrl}assembly/${organization}/${assemblyId}/delete`);
	}

	static watchAssembly(organization: string, assemblyId: string, filePath: string, automaticDeletion?: boolean) {
		return Axios.post(`${this.baseUrl}assembly/${organization}/${assemblyId}/watch/${automaticDeletion ?? false}`, {
			FilePath: filePath,
		});
	}

	static unwatchAssembly(organization: string, assemblyId: string) {
		return Axios.post(`${this.baseUrl}assembly/${organization}/${assemblyId}/unwatch`);
	}

	static getAssemblyPluginDifferences(organization: string, assemblyId: string, filePath: string) {
		return Axios.get(
			`${
				this.baseUrl
			}assemblyplugindiff?organization=${organization}&assemblyid=${assemblyId}&filepath=${encodeURIComponent(
				filePath
			)}`
		);
	}

	static deletePlugin(organization: string, pluginId: string) {
		return Axios.post(`${this.baseUrl}plugin/${organization}/${pluginId}/delete`);
	}

	static retrieveStepDetails(organization: string, stepId: string) {
		return Axios.get(`${this.baseUrl}step/${organization}/${stepId}`);
	}

	static retrieveStepAttributes(organization: string, entity: string) {
		return Axios.get(`${this.baseUrl}step/${organization}/${entity}/availableattributes`);
	}

	static createStep(organization: string, pluginId: string, payload: any) {
		return Axios.post(`${this.baseUrl}step/${organization}/${pluginId}/new`, payload);
	}

	static updateStepDetails(organization: string, stepId: string, payload: any) {
		return Axios.post(`${this.baseUrl}step/${organization}/${stepId}`, payload);
	}

	static deleteStep(organization: string, stepId: string) {
		return Axios.post(`${this.baseUrl}step/${organization}/${stepId}/delete`);
	}

	static enableStep(organization: string, stepId: string) {
		return Axios.post(`${this.baseUrl}step/${organization}/${stepId}/toggleState/enable`);
	}

	static disableStep(organization: string, stepId: string) {
		return Axios.post(`${this.baseUrl}step/${organization}/${stepId}/toggleState/disable`);
	}

	/**
	 * Images
	 */

	static retrieveImageDetails(organization: string, imageId: string) {
		return Axios.get(`${this.baseUrl}image/${organization}/${imageId}`);
	}

	static retrieveImageAbilities(organization: string, stepId: string) {
		return Axios.get(`${this.baseUrl}image/${organization}/${stepId}/new`);
	}

	static createImage(organization, stepId: string, payload: any) {
		return Axios.post(`${this.baseUrl}image/${organization}/${stepId}/new`, payload);
	}

	static updateImageDetails(organization: string, imageId: string, payload: any) {
		return Axios.post(`${this.baseUrl}image/${organization}/${imageId}`, payload);
	}

	static deleteImage(organization: string, imageId: string) {
		return Axios.post(`${this.baseUrl}image/${organization}/${imageId}/delete`);
	}

	/**
	 * Retrieve children
	 */

	static retrieveAssemblies(organization: string) {
		return Axios.get(`${this.baseUrl}assemblies/${organization}`);
	}

	static retrievePlugins(organization: string, assemblyId: string) {
		return Axios.get(`${this.baseUrl}plugins/${organization}/${assemblyId}`);
	}

	static retrieveSteps(organization: string, pluginId: string) {
		return Axios.get(`${this.baseUrl}steps/${organization}/${pluginId}`);
	}

	static retrieveImages(organization: string, stepId: string) {
		return Axios.get(`${this.baseUrl}images/${organization}/${stepId}`);
	}
}

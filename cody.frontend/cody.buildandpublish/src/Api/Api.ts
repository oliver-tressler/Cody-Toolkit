import { Configuration } from "../Configuration/ConfigurationProxy";
import axios from "axios";
type PublishWebResourceRequestData = {
	/**
	 * The local path to the WebResource
	 */
	Path: string;
	/**
	 * The full name (e.g. new_/orders/JS/order_script.bundle.min.js)
	 */
	Name: string;
	/**
	 * The display name of the resource (e.g. order_script.bundle.min)
	 */
	DisplayName: string;
};

function baseUrl() {
	return `http://localhost:${Configuration.backendServerPort}/api/WebResourcePublisher/`;
}

export function publishWebResource(organization: string, data: PublishWebResourceRequestData) {
	return axios.post(`${baseUrl()}${organization}/updateWebResource`, data);
}

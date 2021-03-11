import { Configuration } from "../Configuration/ConfigurationProxy";
import axios from "axios"
type PublishWebResourceRequestData = {
    Path: string,
    Name: string,
    DisplayName: string
}

function baseUrl() {
	return `http://localhost:${Configuration.backendServerPort}/api/WebResourcePublisher/`;
}

export function publishWebResource(organization: string, data: PublishWebResourceRequestData){
    return axios.post(`${baseUrl()}${organization}/updateWebResource`, data);
}
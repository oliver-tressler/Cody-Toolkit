import axios from "axios";
import { InstanceConfiguration } from "../Configuration/MementoProxy";

type BaseUserNameAndAuthenticationDetails = {
	UserName: string;
	Password: string;
	DiscoveryServiceUrl: string;
};
type BaseCredentialsFileAuthenticationDetails = {
	CredentialsFilePath: string;
};
type ConnectionRequest = (BaseCredentialsFileAuthenticationDetails | BaseUserNameAndAuthenticationDetails) & {
	Organization: string;
};
export type OrganizationConfiguration = {
	UniqueName: string;
	FriendlyName: string;
	UrlName: string;
	Url: string;
};

/**
 * Check which organizations are available for a given Dynamics CRM Instance.
 * @param port Port used by the backend service.
 * @param instance A Dynamics CRM Instance.
 * @param password If no credentials file is used a password must be provided.
 */
export async function fetchOrganizationsForInstance(port: number, instance: InstanceConfiguration, password?: string) {
	const data:
		| BaseUserNameAndAuthenticationDetails
		| BaseCredentialsFileAuthenticationDetails = instance.useCredentialsFile
		? {
				CredentialsFilePath: instance.credentialsFilePath,
		  }
		: {
				DiscoveryServiceUrl: instance.discoveryServiceUrl,
				UserName: instance.userName,
				Password: password!,
		  };
	let endpoint =
		`http://localhost:${port}/api/connections/available` +
		(typeof (data as BaseCredentialsFileAuthenticationDetails).CredentialsFilePath == "string"
			? "/useCredentialsFile"
			: "");

	try {
		const result = await axios.post<OrganizationConfiguration[]>(endpoint, data);
		return result;
	} catch (e) {
		throw e;
	}
}

/**
 * Check if the given credentials or the credentials file is actually a valid set of authentication credentials.
 * @param port Port used by the backend service.
 * @param instance A Dynamics CRM Instance.
 * @param password If no credentials file is used a password must be provided.
 */
export async function isValidDiscoveryServiceConfiguration(
	port: number,
	instance: InstanceConfiguration,
	password?: string
) {
	const data:
		| BaseUserNameAndAuthenticationDetails
		| BaseCredentialsFileAuthenticationDetails = instance.useCredentialsFile
		? { CredentialsFilePath: instance.credentialsFilePath }
		: {
				DiscoveryServiceUrl: instance.discoveryServiceUrl,
				UserName: instance.userName,
				Password: password!,
		  };
	const endpoint =
		`http://localhost:${port}/api/connections/isValidInstanceConfiguration` +
		(instance.useCredentialsFile ? "/useCredentialsFile" : "");
	try {
		const result = await axios.post<boolean>(endpoint, data);
		return result;
	} catch (e) {
		throw e;
	}
}

type EstablishConnectionResponse = {
	Expires?: Date;
	Success?: boolean;
};
/**
 * Create a new organization service for a given instance and organization.
 * @param port Port used by the backend service.
 * @param instance A Dynamics CRM Instance.
 * @param organization The organization within the Dynamics CRM Instance.
 * @param password If no credentials file is used a password must be provided.
 * @returns The response contains information about the expiration time of the organization service.
 */
export async function establishConnection(
	port: number,
	instance: InstanceConfiguration,
	organization: OrganizationConfiguration,
	password?: string
): Promise<EstablishConnectionResponse> {
	let data: ConnectionRequest | undefined;
	if (instance.useCredentialsFile === true) {
		data = {
			CredentialsFilePath: instance.credentialsFilePath,
			Organization: organization.UniqueName,
		};
	} else {
		data = {
			Organization: organization.UniqueName,
			DiscoveryServiceUrl: instance.discoveryServiceUrl,
			UserName: instance.userName,
			Password: password!,
		};
	}
	const endpoint =
		`http://localhost:${port}/api/connections/establish` +
		(instance.useCredentialsFile ? "/useCredentialsFile" : "");
	const result = await axios.post<{ Expires?: Date; Success?: boolean }>(endpoint, data);
	return result.data;
}

/**
 * Check if there is an authenticated organization service available for the currently active instance and a given
 * organization.
 * @param port Port used by the backend service
 * @param organizationUniqueName Unique identifier of the dynamics crm organization
 */
export async function connectionAlive(port: number, organizationUniqueName: string) {
	const url = `http://localhost:${port}/api/connections/${organizationUniqueName}`;
	try {
		const response = await axios.get<boolean>(url);
		return response.status == 200 && response.data === true;
	} catch (e) {
		throw e;
	}
}

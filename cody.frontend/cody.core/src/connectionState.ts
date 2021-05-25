import * as vscode from "vscode";
import * as api from "./Api/connectionApi";
import { InstanceConfiguration, InstanceConfigurationProxy } from "./Configuration/MementoProxy";
import cloneDeep from "lodash/cloneDeep";
import { Configuration } from "./Configuration/ConfigurationProxy";
import { requestPassword } from "./Utils/userInteraction";
import { errorHandler } from "./Utils/errorHandling";
export type OrganizationConfiguration = {
    UniqueName: string;
    FriendlyName: string;
    UrlName: string;
    Url: string;
    Expires: Date;
};

export type ConnectionState = {
    activeInstance?: InstanceConfiguration & { authenticated: boolean };
    activeOrganization?: OrganizationConfiguration;
    availableOrganizations: OrganizationConfiguration[];
};

export interface IConnectionStateObserver {
    id: string;
    onConnectionStateChange(currentState: ConnectionState, pendingChange: Promise<ConnectionState>): void;
    dispose(): void;
}

export interface IConnectionStatePublisher {
    registerObserver(observer: IConnectionStateObserver): void;
    unregisterObserver(id: string): void;
}

export class ConnectionManager implements IConnectionStatePublisher, vscode.Disposable {
    private _connectionState: ConnectionState;
    private observers: { [observerId: string]: IConnectionStateObserver };
    public get connectionState() {
        return cloneDeep(this._connectionState);
    }

    constructor(private config: InstanceConfigurationProxy) {
        this.observers = {};
        this._connectionState = {
            availableOrganizations: [],
            activeInstance: undefined,
            activeOrganization: undefined,
        };
        if (config.activeInstance) {
            this._connectionState.activeInstance = {
                ...config.activeInstance,
                authenticated: false,
            };
        }
    }

    dispose() {
        Object.values(this.observers).forEach((observer) => observer.dispose());
    }

    async changeActiveInstance(instanceConfiguration: undefined): Promise<void>;
    async changeActiveInstance(instanceConfiguration: InstanceConfiguration, passwordOrKey: string): Promise<void>;
    async changeActiveInstance(instanceConfiguration: InstanceConfiguration | undefined, passwordOrKey?: string) {
        if (
            this._connectionState.activeInstance?.instanceId == instanceConfiguration?.instanceId &&
            this._connectionState.activeInstance?.authenticated === true
        ) {
            return;
        }

        this._connectionState.availableOrganizations = [];
        if (instanceConfiguration == null) {
            this._connectionState.activeInstance = undefined;
            this.config.activeInstance = undefined;
            return;
        }
        if (passwordOrKey == null) {
            throw new Error("Password or key required to change active instance");
        }
        const isValidConfigurationResult = await api.isValidDiscoveryServiceConfiguration(
            instanceConfiguration,
            passwordOrKey
        );

        if (isValidConfigurationResult.data !== true) {
            throw new Error("Unable to authenticate against the instance");
        }

        const availableOrganizationsResponse = await api.fetchOrganizationsForInstance(
            instanceConfiguration,
            passwordOrKey
        );

        if (availableOrganizationsResponse.data == null || availableOrganizationsResponse.data.length == 0) {
            throw new Error("Unable to retrieve available organizations for instance.");
        }

        this._connectionState = {
            availableOrganizations: availableOrganizationsResponse.data,
            activeInstance: {
                ...instanceConfiguration,
                authenticated: true,
            },
            activeOrganization: undefined,
        };
        this.config.activeInstance = instanceConfiguration;
    }

    async changeActiveOrganization(
        organizationConfiguration: OrganizationConfiguration | undefined,
        passwordOrKey: string
    ) {
        if (organizationConfiguration == null) {
            this._connectionState.activeOrganization = undefined;
            return this.connectionState;
        }
        const validationResult = this.isValidOrganization(organizationConfiguration);
        if (validationResult.valid == false) throw new Error(validationResult.reason);
        const connectionAlreadyEstablished = await api.connectionAlive(organizationConfiguration!.UniqueName);
        if (!connectionAlreadyEstablished) {
            await this.authenticateOrganization(organizationConfiguration, passwordOrKey);
        }
        this._connectionState.activeOrganization = organizationConfiguration;
        return this.connectionState;
    }

    async authenticateOrganization(
        organizationConfiguration: OrganizationConfiguration | undefined,
        passwordOrKey: string
    ) {
        if (organizationConfiguration == null) return;
        const validationResult = this.isValidOrganization(organizationConfiguration);
        if (validationResult.valid == false) throw new Error(validationResult.reason);
        const { Success: connectionSuccessfullyEstablished } = await api.establishConnection(
            this._connectionState.activeInstance!,
            organizationConfiguration,
            passwordOrKey
        );
        if (!connectionSuccessfullyEstablished) {
            throw new Error("Unable to connect to organization");
        }
    }

    async syncConnectionStateWithServer() {
        // TODO: Sync state with server
    }

    registerObserver(observer: IConnectionStateObserver): void {
        this.observers[observer.id] = observer;
        observer.onConnectionStateChange(this._connectionState, Promise.resolve(this._connectionState));
    }

    unregisterObserver(id: string): void {
        delete this.observers[id];
    }

    private isValidOrganization(
        organizationConfiguration?: OrganizationConfiguration
    ): { valid: true } | { valid: false; reason: string } {
        if (organizationConfiguration == null) {
            return { valid: true };
        }
        if (this._connectionState.activeInstance == null) {
            return { valid: false, reason: "No active instance" };
        }
        if (
            !this._connectionState.availableOrganizations.some(
                (org) => org.UniqueName == organizationConfiguration.UniqueName
            )
        ) {
            return {
                valid: false,
                reason:
                    "The given organization with unique name " +
                    organizationConfiguration.UniqueName +
                    "does not exist",
            };
        }
        return { valid: true };
    }
}

export class TaskbarConnectionStateViewer implements IConnectionStateObserver {
    private statusBarItem: vscode.StatusBarItem;
    constructor(public id: string) {
        this.statusBarItem = this.createStatusBarItem();
    }
    onConnectionStateChange(currentState: ConnectionState, pendingChange: Promise<ConnectionState>): void {
        this.updateStatusBarItem(currentState, true);
        pendingChange
            .then((state) => this.updateStatusBarItem(state, false))
            .catch((e) => this.updateStatusBarItem(currentState, false));
    }

    createStatusBarItem() {
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
        statusBarItem.tooltip = "Change Instance or Organization";
        statusBarItem.command = "cody.toolkit.core.connect.switchInstance";
        statusBarItem.text = "$(sync~spin) Starting Backend";
        statusBarItem.show();
        return statusBarItem;
    }

    updateStatusBarItem(state: ConnectionState, operationInProgress: boolean) {
        this.statusBarItem.text = operationInProgress
            ? "$(sync~spin) Connecting ..."
            : state.activeInstance == null
            ? "$(debug-disconnect) No Instance - Offline"
            : state.activeOrganization == null
            ? `$(debug-disconnect) ${state.activeInstance.instanceId} - Offline`
            : `$(key) ${state.activeInstance.instanceId} - ${state.activeOrganization.FriendlyName}`;
    }

    dispose() {
        this.statusBarItem.dispose();
    }
}

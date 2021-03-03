import axios from "axios";
import { ChildProcess, spawn } from "child_process";
import { createInterface } from "readline";
import { v4 } from "uuid";
import * as vsc from "vscode";
import * as api from "../Api/connectionApi";
import { Configuration } from "../Configuration/ConfigurationProxy";
import { InstanceConfiguration } from "../Configuration/MementoProxy";

export type ConnectionState = {
	activeInstance?: InstanceConfiguration & { authenticated: boolean };
	activeOrganization?: api.OrganizationConfiguration;
	availableOrganizations: api.OrganizationConfiguration[];
	connecting: boolean;
};

export class ServerConnector {
	/**
	 * A direct connection to the backend process.
	 */
	public server?: ChildProcess;
	/**
	 * Every module of the Dynamics CRM Toolkit has its own output channel.
	 */
	public outputChannels: { [channelId: string]: vsc.OutputChannel };
	public connectionState: ConnectionState;
	constructor() {
		this.outputChannels = {};
		this.connectionState = {
			availableOrganizations: [],
			connecting: false,
			activeInstance: undefined,
			activeOrganization: undefined,
		};
	}
	public get port(): number {
		return Configuration.backendServerPort;
	}

	public async isServerRunning(): Promise<boolean> {
		try {
			// Early exit if the backend process is still connected.
			if (this.server?.connected === false) return false;
			// Returns Ok 200 if the Web API is available. (Theoretically redundant)
			await axios.get("http://localhost:" + Configuration.backendServerPort + "/api/alive/alive");
			return true;
		} catch {
			// If anything goes wrong during that call, we can assume the server is not available.
			return false;
		}
	}

	/**
	 * Starts the backend as a child process.
	 * @returns Returns itself for chaining
	 */
	async launchServer(): Promise<ServerConnector> {
		const millisecondsBeforeTimeout = 20000;
		// If server is already running, just return.
		if (await this.isServerRunning()) return this;

		const location = Configuration.backendServerLocationInfo.asBackwardSlash();
		// The first thing the server does once the Web API is available is return the string passed as the boot
		// identifier flag. We can use that to get a ready signal.
		const bootIdentifier = v4();
		const startPromise = new Promise<{ timedOut: false }>((resolve, reject) => {
			const server = spawn(
				location.name,
				["-p", Configuration.backendServerPort.toString(), "-i", bootIdentifier],
				{
					cwd: location.dir.replace(/['"]+/g, ""),
				}
			);

			// Handle exit codes. Usually, this should not happen while the extension is active.
			server.addListener("error", (err) => {
				reject(err);
			});
			server.addListener("close", (code, sig) => {
				if (code !== 0) return;
				vsc.window.showErrorMessage("The connection to the CRM Toolkit Backend was closed (" + sig + ").");
				reject(new Error("The connection to the CRM Toolkit Backend was closed"));
			});
			server.addListener("exit", (code, sig) => {
				if (code === 0) return;
				vsc.window.showInformationMessage("The CRM Toolkit Backend was shut down (" + sig + ").");
				reject(new Error("The connection to the CRM Toolkit Backend was closed"));
			});
			server.addListener("disconnect", () => {
				vsc.window.showErrorMessage(
					"The CRM Toolkit Backend process disconnected. The backend will not be shut down when VS Code is closed."
				);
				reject(
					new Error(
						"The CRM Toolkit Backend process disconnected. The backend will not be shut down when VS Code is closed."
					)
				);
			});
			// Read the stdout of the backend line by line. This allows routing the server output to VS Code Output
			// Channels.
			const lineReader = createInterface(server.stdout);
			lineReader.on("line", (d) => {
				if (typeof d !== "string") return;
				// If server isn't started check the output for the boot identifier.
				if (this.server == null && d.includes(bootIdentifier)) {
					this.server == server;
					resolve({ timedOut: false });
					return;
				}
				// Allow outputting to consoles to separate logs from different modules.
				if (d.startsWith("$channel{")) {
					const closingBracketIdx = d.indexOf("}", 10);
					if (closingBracketIdx < 0) return;
					const channel = d.slice(9, closingBracketIdx);
					if (this.outputChannels[channel] == null)
						this.outputChannels[channel] = vsc.window.createOutputChannel(channel);
					this.outputChannels[channel].appendLine(d.slice(closingBracketIdx + 1));
				}
			});
		});
		const timeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
			setTimeout(() => {
				resolve({ timedOut: true });
			}, millisecondsBeforeTimeout);
		});
		const result = await Promise.race<Promise<{ timedOut: boolean }>>([startPromise, timeoutPromise]);
		if (result.timedOut) throw new Error("Unable to reach server");
		return this;
	}
}

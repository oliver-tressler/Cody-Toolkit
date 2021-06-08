import axios from "axios";
import { ChildProcess, spawn } from "child_process";
import * as path from "path";
import { createInterface, Interface } from "readline";
import { v4 } from "uuid";
import { Configuration } from "../Configuration/ConfigurationProxy";
import { defaultBackendServerLocation } from "../setup";

export interface IServerMessageObserver {
	id: string;
	onServerMessage(data: string): void;
}

export interface IServerMessagePublisher {
	registerObserver(observer: IServerMessageObserver): void;
	unregisterObserver(id: string): void;
}

export class ServerConnector implements IServerMessagePublisher{
	private server?: ChildProcess;
	public observers: {[observerId: string]: IServerMessageObserver};
	
	public get port(): number {
		return Configuration.backendServerPort;
	}

	constructor() {
		this.observers = {};
	}

	public async isServerRunning(): Promise<boolean> {
		try {
			// Early exit if the backend process is not connected.
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
	async launchServer(allowRestart?: boolean): Promise<ServerConnector> {
		const millisecondsBeforeTimeout = 20000;
		// If server is already running, just return.
		if (await this.isServerRunning()) return this;

		const location = path.normalize(Configuration.backendServerLocation || defaultBackendServerLocation);
		// The first thing the server does once the Web API is available is return the string passed as the boot
		// identifier flag. We can use that to get a ready signal.
		const bootIdentifier = v4();
		const restartIdentifier = v4();
		const params = ["-p", Configuration.backendServerPort.toString(), "-i", bootIdentifier, "-r", restartIdentifier];
		if (Configuration.disableSSLCertificateCheck) {
			params.push("--nocertificatecheck", "true")
		}
		const startPromise = new Promise<{ timedOut: false }>((resolve, reject) => {
			const server = spawn(
				path.parse(location).base,
				params,
				{
					cwd: path.dirname(location).replace(/['"]+/g, ""),
				}
			);

			// Read the stdout of the backend line by line. This allows routing the server output to VS Code Output
			// Channels.
			const lineReader = createInterface(server.stdout);
			lineReader.on("line", (d) => {
				if (typeof d !== "string") return;
				// If server isn't started check the output for the boot identifier.
				else if (this.server == null && d.includes(bootIdentifier)) {
					this.server = server;
					this.handleServerBootResponses(server)
						.then(() => resolve({ timedOut: false }))
						.catch(reject);
				} else if (this.server == null && d.includes(restartIdentifier)) {
					this.handleReboot(allowRestart)
						.then(() => resolve({ timedOut: false }))
						.catch(reject);
				}
				// Feed the rest to subscribers.
				else {
					this.handleData(d);
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

	/**
	 * Handle exit codes. Usually, this should not happen while the extension is active.
	 */
	private async handleServerBootResponses(server: ChildProcess) {
		return new Promise((resolve, reject) => {
			server.addListener("error", (err) => {
				reject(err);
			});
			server.addListener("close", (code, sig) => {
				if (code !== 0) return;
				reject(new Error("The connection to the CRM Toolkit Backend was closed (" + sig + ")"));
			});
			server.addListener("exit", (code, sig) => {
				if (code === 0) return;
				reject(new Error("The CRM Toolkit Backend was shut down (" + sig + ")"));
			});
			server.addListener("disconnect", () => {
				reject(
					new Error(
						"The CRM Toolkit Backend process disconnected. The backend will not be shut down when VS Code is closed."
					)
				);
			});
			resolve(undefined);
		});
	}

	private async handleReboot(allowRestart?: boolean) {
		if (allowRestart === false) {
			throw new Error("Unable to launch server.");
		}
		await this.launchServer(false);
	}

	private handleData(msg: string) {
		try {
			Object.values(this.observers).forEach(subscriber => subscriber.onServerMessage(msg));
		} catch (e) {
			console.error("Error while processing server message", e)
		}
	}

	public registerObserver(observer: IServerMessageObserver){
		this.observers[observer.id] = observer;
	}

	public unregisterObserver(observerId: string){
		delete this.observers[observerId];
	}
}

export const server = new ServerConnector();
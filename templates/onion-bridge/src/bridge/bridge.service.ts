import { Injectable } from "@nestjs/common";
import { spawn, type ChildProcess } from "node:child_process";
import type { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { AuthService } from "../auth/auth.service.js";
import type { BridgeAuthConfig } from "../auth/types.js";
import { loadConfig } from "../config.js";
import { registerTools } from "../tools.js";

export type BridgeRuntimeConfig = Awaited<ReturnType<typeof loadConfig>>;

@Injectable()
export class BridgeService {
	private config: BridgeRuntimeConfig | null = null;
	private tunnel: ChildProcess | null = null;
	private stopping = false;
	private closeHttp: (() => void) | null = null;

	constructor(private readonly auth: AuthService) {}

	async init(
		profileName = "default",
		workspaceOverride?: string,
	): Promise<BridgeRuntimeConfig> {
		this.config = await loadConfig(profileName, workspaceOverride);
		return this.config;
	}

	getConfig(): BridgeRuntimeConfig {
		if (!this.config) {
			throw new Error("Bridge has not been initialized.");
		}
		return this.config;
	}

	healthPayload() {
		const config = this.getConfig();
		return {
			status: "ok",
			profile: config.name,
			workspace: config.workspace,
			pid: process.pid,
			port: config.port,
			authMode: config.auth.mode,
		};
	}

	async handleMcp(req: Request, res: Response): Promise<void> {
		const config = this.getConfig();
		const auth = config.auth as BridgeAuthConfig;
		const result = await this.auth.authenticateRequest(req, auth);
		if (result.ok === false) {
			this.auth.writeAuthFailure(res, result);
			return;
		}

		const server = this.createMcp(config.workspace);
		const transport = new StreamableHTTPServerTransport({});
		res.on("close", () => {
			void transport.close().catch(() => undefined);
			void server.close().catch(() => undefined);
		});

		try {
			await server.connect(transport);
			await transport.handleRequest(req, res, req.body);
		} catch (error) {
			if (!res.headersSent) {
				res.status(500).json({ error: "MCP request failed" });
			}
			console.error("[onionBridge]", error);
		}
	}

	afterListen(closeHttp: () => void): void {
		const config = this.getConfig();
		this.closeHttp = closeHttp;

		console.log(`[onionBridge] profile: ${config.name}`);
		console.log(`[onionBridge] workspace: ${config.workspace}`);
		console.log(`[onionBridge] MCP: http://127.0.0.1:${config.port}/mcp`);
		console.log(`[onionBridge] auth: ${config.auth.mode}`);
		console.log(
			"[onionBridge] tools: get_workspace_info, list_directory, search_text, read_file, run_workspace_command, request_local_http, start_workspace_process, stop_workspace_process, workspace_process_status, workspace_process_logs, wait_for_local_service, edit_file, write_file, create_directory, delete_path",
		);

		if (config.auth.mode === "none") {
			console.warn(
				"[onionBridge] WARNING: auth mode is none. MCP endpoint accepts unauthenticated requests.",
			);
		} else {
			console.warn(
				"[onionBridge] WARNING: static bearer token auth is enabled. File operations are auto-approved. Use at your own risk.",
			);
		}

		this.tunnel = spawn(
			config.tunnelBin,
			["run", "--profile", config.tunnelProfile],
			{
				stdio: "inherit",
				windowsHide: true,
				env: process.env,
			},
		);

		this.tunnel.once("spawn", () =>
			console.log(`[onionBridge] tunnel: ${config.tunnelProfile}`),
		);
		this.tunnel.on("error", (error) =>
			console.error(`[onionBridge] tunnel failed: ${error.message}`),
		);

		const stop = () => this.stop();
		process.once("SIGINT", stop);
		process.once("SIGTERM", stop);
	}

	stop(): void {
		if (this.stopping) return;
		this.stopping = true;
		this.tunnel?.kill();
		if (this.closeHttp) {
			this.closeHttp();
		} else {
			process.exit(0);
		}
	}

	private createMcp(root: string) {
		const server = new McpServer(
			{ name: "onion-bridge", version: "0.1.0" },
			{
				instructions:
					"Headless workspace MCP server. Changes are written directly to disk without approval.",
			},
		);
		registerTools(server, root);
		return server;
	}
}

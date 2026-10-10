// @ts-nocheck
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { readText, resolveInside, walkFiles } from "./workspace.js";

const text = (value) => ({ content: [{ type: "text", text: value }] });
const errorText = (value) => ({
	content: [{ type: "text", text: value }],
	isError: true,
});

const COMMANDS = new Set(["npm", "pnpm", "npx", "node", "bun", "bunx", "yarn", "git", "codex", "grok", "agy"]);
const MAX_COMMAND_OUTPUT = 80_000;
const MAX_HTTP_BODY = 80_000;
const MAX_PROCESS_OUTPUT = 120_000;
const managedProcesses = new Map();

function activity(action, target = "") {
	const time = new Date().toLocaleTimeString("en-GB", { hour12: false });
	console.log(`${time}  ${action.padEnd(7)} ${target}`.trimEnd());
}

function matchesGlob(file, glob) {
	const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&");
	const pattern = escaped
		.replaceAll("**", "::DOUBLE::")
		.replaceAll("*", "[^/]*")
		.replaceAll("::DOUBLE::", ".*");
	return new RegExp(`^${pattern}$`).test(file);
}

export function registerTools(server, root) {
	server.registerTool(
		"get_workspace_info",
		{
			description: "Return the current Onion Bridge workspace.",
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async () => {
			activity("INFO", ".");
			return text(`Workspace: ${path.basename(root)}\nRoot: ${root}`);
		},
	);

	server.registerTool(
		"list_directory",
		{
			description: "List files below a workspace-relative directory.",
			inputSchema: {
				path: z.string().optional(),
				depth: z.number().int().min(1).max(3).optional(),
			},
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ path: input = ".", depth = 1 }) => {
			activity("LIST", input);
			const base = resolveInside(root, input);
			const files = await walkFiles(root, input);
			const prefix = base.relative ? `${base.relative}/` : "";
			const visible = new Set();
			for (const file of files) {
				const local =
					prefix && file.startsWith(prefix) ? file.slice(prefix.length) : file;
				const parts = local.split("/");
				visible.add(
					parts.slice(0, depth).join("/") + (parts.length > depth ? "/" : ""),
				);
			}
			return text([...visible].sort().join("\n") || "(empty)");
		},
	);

	server.registerTool(
		"search_text",
		{
			description: "Search literal text across workspace files.",
			inputSchema: {
				query: z.string().min(1),
				include: z.string().optional(),
				max_results: z.number().int().min(1).max(500).optional(),
				context_lines: z.number().int().min(0).max(5).optional(),
			},
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ query, include, max_results = 50, context_lines = 0 }) => {
			activity("SEARCH", JSON.stringify(query));
			const files = await walkFiles(root);
			const results = [];
			for (const file of files) {
				if (results.length >= max_results) break;
				if (include && !matchesGlob(file, include)) continue;
				let content;
				try {
					content = (await readText(root, file)).text;
				} catch {
					continue;
				}
				const lines = content.split(/\r?\n/);
				for (let i = 0; i < lines.length && results.length < max_results; i++) {
					if (!lines[i].includes(query)) continue;
					const from = Math.max(0, i - context_lines);
					const to = Math.min(lines.length, i + context_lines + 1);
					results.push(
						`${file}:${i + 1}\n${lines
							.slice(from, to)
							.map((line, n) => `${from + n + 1}│ ${line}`)
							.join("\n")}`,
					);
				}
			}
			return text(results.join("\n\n") || "No matches.");
		},
	);

	server.registerTool(
		"read_file",
		{
			description: "Read a workspace-relative UTF-8 file.",
			inputSchema: {
				path: z.string(),
				start_line: z.number().int().min(1).optional(),
				end_line: z.number().int().min(1).optional(),
			},
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ path: input, start_line, end_line }) => {
			activity("READ", input);
			const file = await readText(root, input);
			const lines = file.text.split(/\r?\n/);
			const start = start_line ?? 1;
			const end = Math.min(end_line ?? lines.length, lines.length);
			const body = lines
				.slice(start - 1, end)
				.map((line, i) => `${start + i}│ ${line}`)
				.join("\n");
			return text(
				`<file_content path="${file.relative}" lines="${start}-${end}" total_lines="${lines.length}">\n${body}\n</file_content>`,
			);
		},
	);

	server.registerTool(
		"run_workspace_command",
		{
			description:
				"Run an allowed development command inside the workspace with shell disabled. Returns exit code, stdout, and stderr.",
			inputSchema: {
				command: z.enum(["npm", "pnpm", "npx", "node", "bun", "bunx", "yarn", "git", "codex", "grok", "agy"]),
				args: z.array(z.string()).optional(),
				cwd: z.string().optional(),
				timeout_ms: z.number().int().min(1).max(600_000).optional(),
			},
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				openWorldHint: false,
			},
		},
		async ({ command, args = [], cwd = ".", timeout_ms = 120_000 }) => {
			if (!COMMANDS.has(command)) throw new Error("Command is not allowed.");
			const working = resolveInside(root, cwd);
			const commandText = [command, ...args].join(" ");
			activity("RUN", commandText);

			return await new Promise((resolve) => {
				const child = spawn(command, args, {
					cwd: working.absolute,
					shell: false,
					windowsHide: true,
					env: process.env,
				});

				let stdout = "";
				let stderr = "";
				let settled = false;

				const append = (current, chunk) => {
					if (current.length >= MAX_COMMAND_OUTPUT) return current;
					const next = current + chunk.toString();
					return next.length > MAX_COMMAND_OUTPUT
						? next.slice(0, MAX_COMMAND_OUTPUT) + "\n[output truncated]"
						: next;
				};

				child.stdout.on("data", (chunk) => {
					stdout = append(stdout, chunk);
				});
				child.stderr.on("data", (chunk) => {
					stderr = append(stderr, chunk);
				});

				const timer = setTimeout(() => {
					if (settled) return;
					settled = true;
					child.kill();
					resolve(
						errorText(
							`Command timed out after ${timeout_ms}ms.\n\nstdout:\n${stdout || "(empty)"}\n\nstderr:\n${stderr || "(empty)"}`,
						),
					);
				}, timeout_ms);

				child.on("error", (error) => {
					if (settled) return;
					settled = true;
					clearTimeout(timer);
					resolve(errorText(`Failed to start command: ${error.message}`));
				});

				child.on("close", (code, signal) => {
					if (settled) return;
					settled = true;
					clearTimeout(timer);
					const result =
						`command: ${commandText}\n` +
						`cwd: ${working.relative || "."}\n` +
						`exit_code: ${code ?? "null"}\n` +
						`signal: ${signal ?? "-"}\n\n` +
						`stdout:\n${stdout || "(empty)"}\n\n` +
						`stderr:\n${stderr || "(empty)"}`;
					resolve(code === 0 ? text(result) : errorText(result));
				});
			});
		},
	);

	server.registerTool(
		"request_local_http",
		{
			description:
				"Call a localhost HTTP endpoint. Only localhost, 127.0.0.1, and ::1 are allowed. Returns status and response body.",
			inputSchema: {
				url: z.string().url(),
				method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
				headers: z.record(z.string(), z.string()).optional(),
				body: z.unknown().optional(),
				timeout_ms: z.number().int().min(1).max(120_000).optional(),
			},
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				openWorldHint: false,
			},
		},
		async ({ url, method = "GET", headers = {}, body, timeout_ms = 30_000 }) => {
			const target = new URL(url);
			const host = target.hostname.replace(/^\[|\]$/g, "");
			if (!["localhost", "127.0.0.1", "::1"].includes(host))
				throw new Error("Only localhost loopback URLs are allowed.");
			if (!["http:", "https:"].includes(target.protocol))
				throw new Error("Only HTTP(S) URLs are allowed.");

			activity("HTTP", `${method} ${target.href}`);
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), timeout_ms);

			try {
				const requestHeaders = new Headers(headers);
				let requestBody;
				if (body !== undefined) {
					if (typeof body === "string") {
						requestBody = body;
					} else {
						requestBody = JSON.stringify(body);
						if (!requestHeaders.has("content-type"))
							requestHeaders.set("content-type", "application/json");
					}
				}

				const response = await fetch(target, {
					method,
					headers: requestHeaders,
					body: requestBody,
					signal: controller.signal,
				});
				const raw = await response.text();
				const responseBody =
					raw.length > MAX_HTTP_BODY
						? raw.slice(0, MAX_HTTP_BODY) + "\n[body truncated]"
						: raw;
				const result =
					`status: ${response.status} ${response.statusText}\n` +
					`url: ${target.href}\n\n` +
					(responseBody || "(empty body)");
				return response.ok ? text(result) : errorText(result);
			} catch (error) {
				if (error?.name === "AbortError")
					return errorText(`Request timed out after ${timeout_ms}ms.`);
				throw error;
			} finally {
				clearTimeout(timer);
			}
		},
	);

	server.registerTool(
		"start_workspace_process",
		{
			description:
				"Start a long-running development process in the workspace and return a process_id.",
			inputSchema: {
				command: z.enum(["npm", "pnpm", "npx", "node", "bun", "bunx", "yarn", "codex", "grok", "agy"]),
				args: z.array(z.string()).optional(),
				cwd: z.string().optional(),
			},
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				openWorldHint: false,
			},
		},
		async ({ command, args = [], cwd = "." }) => {
			const working = resolveInside(root, cwd);
			const commandText = [command, ...args].join(" ");
			activity("START", commandText);

			const child = spawn(command, args, {
				cwd: working.absolute,
				shell: false,
				windowsHide: true,
				env: process.env,
			});

			const processId = `proc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			const entry = {
				id: processId,
				command,
				args,
				cwd: working.relative || ".",
				child,
				status: "running",
				exitCode: null,
				signal: null,
				stdout: "",
				stderr: "",
				startedAt: new Date().toISOString(),
			};

			const append = (current, chunk) => {
				const next = current + chunk.toString();
				return next.length > MAX_PROCESS_OUTPUT
					? next.slice(next.length - MAX_PROCESS_OUTPUT)
					: next;
			};

			child.stdout.on("data", (chunk) => {
				entry.stdout = append(entry.stdout, chunk);
			});
			child.stderr.on("data", (chunk) => {
				entry.stderr = append(entry.stderr, chunk);
			});
			child.on("close", (code, signal) => {
				entry.status = "exited";
				entry.exitCode = code;
				entry.signal = signal;
			});
			child.on("error", (error) => {
				entry.stderr = append(entry.stderr, error.message);
				entry.status = "exited";
			});

			managedProcesses.set(processId, entry);
			return text(
				JSON.stringify({
					process_id: processId,
					pid: child.pid ?? null,
					status: entry.status,
					command: commandText,
					cwd: entry.cwd,
				}),
			);
		},
	);

	server.registerTool(
		"stop_workspace_process",
		{
			description: "Stop a process previously started by start_workspace_process.",
			inputSchema: { process_id: z.string().min(1) },
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				openWorldHint: false,
			},
		},
		async ({ process_id }) => {
			activity("STOP", process_id);
			const entry = managedProcesses.get(process_id);
			if (!entry) return errorText("Managed process not found.");
			if (entry.status === "running") entry.child.kill();
			return text(
				JSON.stringify({
					process_id,
					status: entry.status,
					pid: entry.child.pid ?? null,
				}),
			);
		},
	);

	server.registerTool(
		"workspace_process_status",
		{
			description:
				"List Onion-managed workspace processes or inspect one process.",
			inputSchema: { process_id: z.string().optional() },
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ process_id } = {}) => {
			activity("PROC", process_id ?? "all");
			const summarize = (entry) => ({
				process_id: entry.id,
				pid: entry.child.pid ?? null,
				status: entry.status,
				command: [entry.command, ...entry.args].join(" "),
				cwd: entry.cwd,
				exit_code: entry.exitCode,
				signal: entry.signal,
				started_at: entry.startedAt,
			});

			if (process_id) {
				const entry = managedProcesses.get(process_id);
				return entry
					? text(JSON.stringify(summarize(entry)))
					: errorText("Managed process not found.");
			}

			return text(JSON.stringify([...managedProcesses.values()].map(summarize)));
		},
	);

	server.registerTool(
		"workspace_process_logs",
		{
			description: "Return recent stdout and stderr for a managed process.",
			inputSchema: {
				process_id: z.string().min(1),
				lines: z.number().int().min(1).max(500).optional(),
			},
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ process_id, lines = 100 }) => {
			activity("LOGS", process_id);
			const entry = managedProcesses.get(process_id);
			if (!entry) return errorText("Managed process not found.");
			const tail = (value) => {
				const parts = value.split(/\r?\n/);
				return parts.slice(Math.max(0, parts.length - lines)).join("\n");
			};
			return text(
				`process_id: ${process_id}\nstatus: ${entry.status}\n\nstdout:\n${tail(entry.stdout) || "(empty)"}\n\nstderr:\n${tail(entry.stderr) || "(empty)"}`,
			);
		},
	);

	server.registerTool(
		"wait_for_local_service",
		{
			description:
				"Wait until a localhost HTTP service responds. Only localhost, 127.0.0.1, and ::1 are allowed.",
			inputSchema: {
				url: z.string().url(),
				timeout_ms: z.number().int().min(1).max(120_000).optional(),
				interval_ms: z.number().int().min(50).max(5_000).optional(),
				expect_status: z.number().int().min(100).max(599).optional(),
			},
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ url, timeout_ms = 15_000, interval_ms = 300, expect_status }) => {
			const target = new URL(url);
			const host = target.hostname.replace(/^\[|\]$/g, "");
			if (!["localhost", "127.0.0.1", "::1"].includes(host))
				throw new Error("Only localhost loopback URLs are allowed.");
			if (!["http:", "https:"].includes(target.protocol))
				throw new Error("Only HTTP(S) URLs are allowed.");

			activity("WAIT", target.href);
			const started = Date.now();
			let attempts = 0;
			let last = "no response";

			while (Date.now() - started < timeout_ms) {
				attempts += 1;
				const controller = new AbortController();
				const timer = setTimeout(
					() => controller.abort(),
					Math.min(interval_ms * 2, 2_000),
				);
				try {
					const response = await fetch(target, {
						method: "GET",
						signal: controller.signal,
					});
					last = `${response.status} ${response.statusText}`;
					const ready =
						expect_status === undefined
							? response.status >= 200 && response.status < 500
							: response.status === expect_status;
					if (ready) {
						return text(
							`ready: true\nurl: ${target.href}\nstatus: ${response.status}\nattempts: ${attempts}\nelapsed_ms: ${Date.now() - started}`,
						);
					}
				} catch (error) {
					last = error?.message ?? String(error);
				} finally {
					clearTimeout(timer);
				}

				await new Promise((resolve) => setTimeout(resolve, interval_ms));
			}

			return errorText(
				`Service did not become ready within ${timeout_ms}ms.\nurl: ${target.href}\nattempts: ${attempts}\nlast_result: ${last}`,
			);
		},
	);

	server.registerTool(
		"edit_file",
		{
			description:
				"Replace one exact occurrence in an existing file. Writes directly to disk without approval.",
			inputSchema: {
				path: z.string(),
				old_string: z.string(),
				new_string: z.string(),
			},
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				openWorldHint: false,
			},
		},
		async ({ path: input, old_string, new_string }) => {
			activity("EDIT", input);
			const file = await readText(root, input);
			const first = file.text.indexOf(old_string);
			if (first < 0) throw new Error("old_string was not found.");
			if (file.text.indexOf(old_string, first + old_string.length) >= 0)
				throw new Error("old_string appears more than once.");
			await fs.writeFile(
				file.absolute,
				file.text.slice(0, first) +
					new_string +
					file.text.slice(first + old_string.length),
				"utf8",
			);
			return text(`Updated ${file.relative}.`);
		},
	);

	server.registerTool(
		"write_file",
		{
			description:
				"Create or fully replace a file. Writes directly to disk without approval.",
			inputSchema: { path: z.string(), content: z.string() },
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				openWorldHint: false,
			},
		},
		async ({ path: input, content }) => {
			activity("WRITE", input);
			const target = resolveInside(root, input);
			await fs.mkdir(path.dirname(target.absolute), { recursive: true });
			await fs.writeFile(target.absolute, content, "utf8");
			return text(`Wrote ${target.relative}.`);
		},
	);

	server.registerTool(
		"create_directory",
		{
			description: "Create a directory recursively without approval.",
			inputSchema: { path: z.string() },
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				openWorldHint: false,
			},
		},
		async ({ path: input }) => {
			activity("MKDIR", input);
			const target = resolveInside(root, input);
			await fs.mkdir(target.absolute, { recursive: true });
			return text(`Created ${target.relative}/.`);
		},
	);

	server.registerTool(
		"delete_path",
		{
			description: "Delete a file or directory directly without approval.",
			inputSchema: { path: z.string(), recursive: z.boolean().optional() },
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				openWorldHint: false,
			},
		},
		async ({ path: input, recursive = false }) => {
			activity("DELETE", input);
			const target = resolveInside(root, input);
			if (!target.relative)
				throw new Error("Workspace root cannot be deleted.");
			const stat = await fs.stat(target.absolute);
			if (stat.isDirectory() && !recursive)
				throw new Error("recursive=true is required for directories.");
			await fs.rm(target.absolute, { recursive, force: false });
			return text(`Deleted ${target.relative}.`);
		},
	);
}

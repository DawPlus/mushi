// @ts-nocheck
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_LOG_LIMIT = 50;

function emptyStatus(workspace = null) {
  return {
    state: "idle",
    workspace,
    pid: null,
    command: null,
    url: null,
    error: null,
    recentLogs: [],
  };
}

function detectLocalUrl(text) {
  const clean = String(text).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "");
  const match = clean.match(
    /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?(?:\/[^\s]*)?/i,
  );
  if (!match) return null;
  return match[0].replace("://0.0.0.0", "://localhost");
}

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function resolveDevCommand(workspace) {
  const packageJsonPath = path.join(workspace, "package.json");
  const pkg = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
  const script = pkg?.scripts?.dev ? "dev" : pkg?.scripts?.start ? "start" : null;
  if (!script) {
    throw new Error("package.json에 dev 또는 start script가 없습니다.");
  }

  let bin = "npm";
  if (await exists(path.join(workspace, "pnpm-lock.yaml"))) bin = "pnpm";
  else if (
    (await exists(path.join(workspace, "bun.lock"))) ||
    (await exists(path.join(workspace, "bun.lockb")))
  ) {
    bin = "bun";
  } else if (await exists(path.join(workspace, "yarn.lock"))) bin = "yarn";

  const scriptCommand = String(pkg.scripts[script] || "");
  const portMatch = scriptCommand.match(/--port(?:=|\s+)(\d+)/);
  return {
    bin,
    args: bin === "npm" ? ["run", script] : [script],
    label: `${bin} ${bin === "npm" ? "run " : ""}${script}`,
    fallbackUrl: portMatch ? `http://localhost:${portMatch[1]}/` : null,
  };
}

export function createDevProcessManager({
  spawnImpl = spawn,
  logLimit = DEFAULT_LOG_LIMIT,
} = {}) {
  const entries = new Map();

  function keyFor(workspace) {
    return path.resolve(workspace);
  }

  function pushLog(entry, chunk, stream) {
    const text = String(chunk);
    entry.url = detectLocalUrl(text) || entry.url;
    for (const line of text.split(/\r?\n/)) {
      if (!line) continue;
      entry.recentLogs.push(`[${stream}] ${line}`);
    }
    while (entry.recentLogs.length > logLimit) entry.recentLogs.shift();
  }

  function snapshot(entry) {
    if (!entry) return emptyStatus();
    return {
      state: entry.state,
      workspace: entry.workspace,
      pid: entry.child?.pid ?? null,
      command: entry.command,
      url: entry.url,
      error: entry.error,
      recentLogs: [...entry.recentLogs],
    };
  }

  function getStatus(workspace) {
    if (workspace) return snapshot(entries.get(keyFor(workspace)));
    const projects = [...entries.values()].map(snapshot);
    return {
      projects,
      activeCount: projects.filter((item) =>
        ["starting", "running", "stopping"].includes(item.state),
      ).length,
    };
  }

  function attach(entry, child) {
    entry.child = child;
    child.stdout?.on("data", (chunk) => pushLog(entry, chunk, "out"));
    child.stderr?.on("data", (chunk) => pushLog(entry, chunk, "err"));
    child.on("error", (error) => {
      entry.error = error.message;
      entry.state = "error";
      pushLog(entry, error.message, "err");
      entry.child = null;
    });
    child.on("exit", (code, signal) => {
      if (entry.state === "stopping") {
        entry.state = "idle";
        entry.error = null;
        entries.delete(entry.workspace);
      } else if (entry.state === "starting" || entry.state === "running") {
        entry.error =
          code === 0 || code === null
            ? signal
              ? `Dev server exited via ${signal}`
              : null
            : `Dev server exited with code ${code}`;
        entry.state = entry.error ? "error" : "idle";
        if (!entry.error) entries.delete(entry.workspace);
      }
      entry.child = null;
    });
  }

  async function start(workspace) {
    if (!workspace) throw new Error("workspace is required");
    const key = keyFor(workspace);
    const existing = entries.get(key);
    if (
      existing &&
      ["starting", "running", "stopping"].includes(existing.state)
    ) {
      throw new Error("Dev server already active for this project");
    }

    const command = await resolveDevCommand(key);
    const entry = {
      workspace: key,
      state: "starting",
      command: command.label,
      url: command.fallbackUrl,
      error: null,
      recentLogs: existing?.recentLogs ? [...existing.recentLogs] : [],
      child: null,
    };
    entries.set(key, entry);

    const child = spawnImpl(command.bin, command.args, {
      cwd: key,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: process.platform === "win32",
      detached: process.platform !== "win32",
      env: process.env,
    });
    attach(entry, child);

    await new Promise((resolve, reject) => {
      const onSpawn = () => {
        cleanup();
        entry.state = "running";
        resolve();
      };
      const onError = (error) => {
        cleanup();
        entry.error = error.message;
        entry.state = "error";
        entry.child = null;
        reject(error);
      };
      const cleanup = () => {
        child.off("spawn", onSpawn);
        child.off("error", onError);
      };
      child.once("spawn", onSpawn);
      child.once("error", onError);
    });

    return snapshot(entry);
  }

  async function stop(workspace) {
    if (!workspace) throw new Error("workspace is required");
    const key = keyFor(workspace);
    const entry = entries.get(key);
    if (!entry?.child) {
      entries.delete(key);
      return emptyStatus(key);
    }

    entry.state = "stopping";
    const active = entry.child;
    await new Promise((resolve) => {
      const done = () => {
        active.off("exit", done);
        resolve();
      };
      active.once("exit", done);
      try {
        if (process.platform === "win32") {
          active.kill("SIGTERM");
        } else {
          process.kill(-active.pid, "SIGTERM");
        }
      } catch {
        active.kill("SIGTERM");
      }
      setTimeout(() => {
        if (entry.child !== active) return;
        try {
          if (process.platform === "win32") {
            active.kill("SIGKILL");
          } else {
            process.kill(-active.pid, "SIGKILL");
          }
        } catch {
          active.kill("SIGKILL");
        }
      }, 2000).unref?.();
    });

    entries.delete(key);
    return emptyStatus(key);
  }

  async function stopAll() {
    for (const key of [...entries.keys()]) {
      try {
        await stop(key);
      } catch {
        // Best-effort shutdown.
      }
    }
  }

  return { start, stop, stopAll, getStatus };
}

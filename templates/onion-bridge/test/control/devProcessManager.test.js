import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createDevProcessManager } from "../../dist/control/devProcessManager.js";

function fakeChild(pid = 1) {
  const child = new EventEmitter();
  child.pid = pid;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = () => {
    queueMicrotask(() => child.emit("exit", 0, null));
    return true;
  };
  return child;
}

test("dev manager starts detected package manager command and stops independently", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "onion-dev-"));
  await fs.writeFile(
    path.join(dir, "package.json"),
    JSON.stringify({ scripts: { dev: "vite --port 3000" } }),
  );
  await fs.writeFile(path.join(dir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");

  const spawned = [];
  const child = fakeChild(321);
  const manager = createDevProcessManager({
    spawnImpl: (command, args, options) => {
      spawned.push({ command, args, options });
      queueMicrotask(() => child.emit("spawn"));
      return child;
    },
  });

  const running = await manager.start(dir);
  assert.equal(running.state, "running");
  assert.equal(running.command, "pnpm dev");
  assert.equal(running.pid, 321);
  assert.equal(running.url, "http://localhost:3000/");
  assert.equal(spawned[0].command, "pnpm");
  assert.deepEqual(spawned[0].args, ["dev"]);
  assert.equal(spawned[0].options.cwd, dir);

  child.stdout.emit("data", "\u001b[32m  ➜  Local:   http://localhost:3001/\u001b[0m\n");
  assert.equal(manager.getStatus(dir).url, "http://localhost:3001/");

  const stopped = await manager.stop(dir);
  assert.equal(stopped.state, "idle");
  assert.equal(manager.getStatus().activeCount, 0);
});

test("dev manager falls back to npm start and rejects projects without runnable scripts", async () => {
  const startDir = await fs.mkdtemp(path.join(os.tmpdir(), "onion-dev-start-"));
  await fs.writeFile(
    path.join(startDir, "package.json"),
    JSON.stringify({ scripts: { start: "node server.js" } }),
  );

  const child = fakeChild(222);
  const manager = createDevProcessManager({
    spawnImpl: (command, args) => {
      assert.equal(command, "npm");
      assert.deepEqual(args, ["run", "start"]);
      queueMicrotask(() => child.emit("spawn"));
      return child;
    },
  });

  const status = await manager.start(startDir);
  assert.equal(status.command, "npm run start");
  await manager.stop(startDir);

  const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), "onion-dev-empty-"));
  await fs.writeFile(path.join(emptyDir, "package.json"), JSON.stringify({ scripts: {} }));
  await assert.rejects(() => manager.start(emptyDir), /dev 또는 start script/);
});

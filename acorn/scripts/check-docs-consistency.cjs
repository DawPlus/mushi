#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

let failed = false;
const { parseBoard, boardValue } = require("./board.cjs");
const { parseFrontmatter, repairBudget, validateTicketTransition } = require("./ticket.cjs");
const args = process.argv.slice(2);
const selectedTicket = args[0] === "--ticket" && args.length === 2 ? args[1] : null;
if (args.length && (!selectedTicket || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(selectedTicket))) {
  console.error("Usage: node acorn/scripts/check-docs-consistency.cjs [--ticket <ticket-id>]");
  process.exit(2);
}
const fail = (message) => {
  console.error(`FAIL: ${message}`);
  failed = true;
};

const required = [
  "AGENTS.md",
  "acorn/config.json",
  "acorn/state.json",
  "acorn/workflow/workflow.md",
  "acorn/workflow/gates.md",
  "acorn/workflow/handoff.md",
  "acorn/workflow/tickets.md",
  "acorn/skills/adhd-output/SKILL.md",
  "acorn/skills/coding-standards/SKILL.md",
  ".codex/skills/acorn-brain/SKILL.md",
  ".codex/skills/acorn-brain/agents/openai.yaml",
  ".codex/skills/acorn-brain/brainstorming.md",
];

if (!process.env.ACORN_KIT_SOURCE_CHECK) required.push("acorn/third-party-notices.md");

for (const file of required) {
  if (!fs.existsSync(file)) fail(`missing ${file}`);
}

const brainPolicyPath = ".codex/skills/acorn-brain/agents/openai.yaml";
if (fs.existsSync(brainPolicyPath) && !/allow_implicit_invocation:\s*false/.test(fs.readFileSync(brainPolicyPath, "utf8"))) {
  fail("acorn-brain must disable implicit invocation");
}

let config = {};
try {
  config = JSON.parse(fs.readFileSync("acorn/config.json", "utf8"));
} catch {
  fail("invalid acorn/config.json");
}

const boardPath = config.ticketBoardPath || "docs/tickets/board.md";
if (!fs.existsSync(boardPath)) fail(`missing ${boardPath}`);

const parsed = parseBoard(fs.existsSync(boardPath) ? fs.readFileSync(boardPath, "utf8") : "");
for (const column of ["Ticket", "State", "Next"]) {
  if (!parsed.headers.includes(column)) fail(`missing required board column: ${column}`);
}
const allowedStates = new Set(["draft", "ready", "in_progress", "review", "docs", "blocked", "done", "superseded"]);
const roles = new Set(Object.keys(config.roles || {}).map((role) => role.toLowerCase()));
const hasManagedRouting = parsed.headers.includes("Role") && parsed.headers.includes("Mode");
const ticketFile = (row) => {
  const linked = boardValue(parsed, row, "Body") || boardValue(parsed, row, "Links");
  const target = linked?.match(/\]\(\s*<?([^>\s)]+)>?/)?.[1]?.split(/[?#]/)[0];
  if (target && !/^[a-z][a-z0-9+.-]*:/i.test(target)) return path.resolve(path.dirname(boardPath), target);
  const pattern = config.ticketBodyPath || "docs/tickets/active/{ID}.md";
  return pattern.includes("{ID}") ? path.resolve(pattern.replace("{ID}", boardValue(parsed, row, "Ticket"))) : null;
};
const selectedRows = selectedTicket
  ? parsed.rows.filter((row) => boardValue(parsed, row, "Ticket") === selectedTicket)
  : parsed.rows;
if (selectedTicket && selectedRows.length !== 1) fail(`expected one BOARD row for ${selectedTicket}, found ${selectedRows.length}`);
for (const row of selectedRows) {
  const value = (name) => boardValue(parsed, row, name);
  if (row.length !== parsed.headers.length) fail(`invalid board row width: ${value("Ticket")}`);
  if (!allowedStates.has(value("State"))) fail(`invalid ticket state: ${value("State")}`);
  if (value("Role") && roles.size && !roles.has(value("Role").toLowerCase())) fail(`unknown ticket role: ${value("Role")}`);
  if (!value("Next")) fail(`missing Next: ${value("Ticket")}`);
  else if (hasManagedRouting && !["human", "-"].includes(value("Next").toLowerCase()) && roles.size && !roles.has(value("Next").toLowerCase())) fail(`unknown Next role: ${value("Next")}`);
  if (value("Mode") && !["confirm-only", "implementation"].includes(value("Mode"))) fail(`invalid ticket mode: ${value("Mode")}`);

  const file = ticketFile(row);
  if (!file || !fs.existsSync(file)) {
    if (selectedTicket) fail(`missing active ticket body: ${selectedTicket}`);
    continue;
  }
  const metadata = parseFrontmatter(fs.readFileSync(file, "utf8"));
  if (selectedTicket && metadata?.id !== selectedTicket) fail(`ticket body id must be ${selectedTicket}`);
  if (metadata) {
    try {
      repairBudget(config, metadata);
    } catch (error) {
      fail(`${value("Ticket")}: ${error.message}`);
    }
  }
  if (!metadata?.gates) continue;
  for (const error of validateTicketTransition(metadata, {
    state: value("State"),
    next: value("Next"),
    role: value("Role") || "worker",
  })) fail(`${value("Ticket")}: ${error}`);
}

if (fs.existsSync("acorn/state.json") && fs.existsSync(boardPath)) {
  try {
    const state = JSON.parse(fs.readFileSync("acorn/state.json", "utf8"));
    const legacyPhases = new Set(["request", "worker", "verification", "review", "docs"]);
    if (state.phase && !config.workflow?.phases?.includes(state.phase) && !legacyPhases.has(state.phase)) {
      fail(`invalid state phase: ${state.phase}`);
    }
    if (state.activeTicket) {
      const row = parsed.rows.find((row) => boardValue(parsed, row, "Ticket") === state.activeTicket);
      if (!row) {
        fail(`active ticket missing from board: ${state.activeTicket}`);
      } else {
        const ticketState = boardValue(parsed, row, "State");
        if (ticketState === "done" || ticketState === "superseded") {
          fail(`active ticket is terminal on board: ${state.activeTicket} (${ticketState})`);
        }
      }
    }
  } catch {
    fail("invalid acorn/state.json");
  }
}

function markdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(target);
    return entry.name.endsWith(".md") ? [target] : [];
  });
}

for (const file of ["docs", "acorn"].flatMap(markdownFiles)) {
  const content = fs.readFileSync(file, "utf8");
  for (const match of content.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, "").split(/[?#]/)[0];
    if (
      !target ||
      /^(https?:|mailto:|app:|file:|#)/.test(target) ||
      (!target.includes("/") && !target.startsWith(".") && !target.endsWith(".md"))
    ) continue;
    const resolved =
      target.startsWith("docs/") || target.startsWith("acorn/")
        ? target
        : path.resolve(path.dirname(file), target);
    if (!fs.existsSync(resolved)) {
      fail(`${file} references missing markdown link target ${target}`);
    }
  }
}

if (failed) process.exit(1);
console.log("docs consistency OK");

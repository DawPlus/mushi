#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { parseBoard, boardValue } = require("./board.cjs");
const { parseFrontmatter, repairBudget, validateGateContract } = require("./ticket.cjs");

const preflight = process.argv[2] === "--preflight";
const id = process.argv[preflight ? 3 : 2];
if (!id || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id)) {
	console.error("Usage: node acorn/scripts/check-ticket-completion.cjs [--preflight] <ticket-id>");
	process.exit(2);
}

const config = JSON.parse(fs.readFileSync("acorn/config.json", "utf8"));
const boardPath = config.ticketBoardPath || "docs/tickets/board.md";
const board = fs.existsSync(boardPath)
	? parseBoard(fs.readFileSync(boardPath, "utf8"))
	: { headers: [], rows: [] };
const boardRow = board.rows.find((row) => boardValue(board, row, "Ticket") === id);
const errors = [];

let file;
if (preflight) {
	const pattern = config.ticketBodyPath || "docs/tickets/active/{ID}.md";
	file = pattern.includes("{ID}") ? pattern.replace("{ID}", id) : null;
	if (!file || !fs.existsSync(file)) errors.push(`missing active ticket body: ${file || "ticketBodyPath must contain {ID}"}`);
	if (!boardRow) errors.push("ticket must remain on BOARD during preflight");
	else {
		if (boardValue(board, boardRow, "State") !== "docs") errors.push("BOARD state must be docs during preflight");
		if (!["reporter", "doc-updater"].includes((boardValue(board, boardRow, "Next") || "").toLowerCase())) {
			errors.push("BOARD Next must be reporter during preflight");
		}
	}
} else {
	const archiveRoot = config.ticketArchivePath || "docs/tickets/archive";
	const matches = fs.existsSync(archiveRoot)
		? fs.readdirSync(archiveRoot, { withFileTypes: true })
			.filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}$/.test(entry.name))
			.map((entry) => path.join(archiveRoot, entry.name, `${id}.md`))
			.filter((candidate) => fs.existsSync(candidate))
		: [];
	if (matches.length !== 1) errors.push(`expected one archived ticket, found ${matches.length}`);
	[file] = matches;
	if (boardRow) errors.push("ticket is still present on BOARD");
}

if (file && fs.existsSync(file)) {
	const content = fs.readFileSync(file, "utf8");
	const metadata = parseFrontmatter(content);
	if (!metadata) errors.push("missing YAML front matter");
	else {
		if (metadata.id !== id) errors.push(`id must be ${id}`);
		if (metadata.state !== "done") errors.push("state must be done");
		if (metadata.gates) {
			if (metadata.verification !== "passed") errors.push("verification must be passed");
			errors.push(...validateGateContract(metadata, true).errors);
		} else if (metadata.qa !== "passed") {
			errors.push("legacy qa must be passed when gates are absent");
		}
		const completedAt = metadata.completed_at;
		const timestampPattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:0\d|1\d|2[0-3]):[0-5]\d)$/;
		const [year, month, day] = (completedAt || "").slice(0, 10).split("-").map(Number);
		const calendarDate = new Date(0);
		calendarDate.setUTCHours(0, 0, 0, 0);
		calendarDate.setUTCFullYear(year, month - 1, day);
		const validCalendarDate = calendarDate.getUTCFullYear() === year && calendarDate.getUTCMonth() === month - 1 && calendarDate.getUTCDate() === day;
		if (!completedAt || !timestampPattern.test(completedAt) || Number.isNaN(Date.parse(completedAt)) || !validCalendarDate) {
			errors.push("completed_at must be an ISO 8601 timestamp");
		} else if (!preflight && path.basename(path.dirname(file)) !== completedAt.slice(0, 7)) {
			errors.push("archive month must match completed_at");
		}
		try {
			const { repairs, limit } = repairBudget(config, metadata);
			if (repairs > limit) errors.push(`repairs_used exceeds allowed limit (${repairs} > ${limit})`);
		} catch (error) {
			errors.push(error.message);
		}
	}
	if (!/^## Result\s*\r?\n\s*\S/m.test(content)) errors.push("missing non-empty Result section");
}

if (!fs.existsSync(boardPath)) errors.push(`missing BOARD: ${boardPath}`);
if (errors.length) {
	for (const error of errors) console.error(`FAIL: ${error}`);
	process.exit(1);
}
console.log(`ticket completion ${preflight ? "preflight " : ""}OK: ${id}`);

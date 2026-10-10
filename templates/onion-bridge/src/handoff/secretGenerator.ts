import { randomInt } from "node:crypto";
import type { SecretGeneratorPort } from "./ports.js";

/** Short pronounceable words (3–4 letters). */
export const SECRET_WORDS = [
	"ace",
	"arc",
	"ash",
	"bay",
	"bee",
	"blue",
	"bolt",
	"cat",
	"clay",
	"code",
	"dawn",
	"dock",
	"dog",
	"echo",
	"elm",
	"fern",
	"fox",
	"glow",
	"gold",
	"hawk",
	"ice",
	"iron",
	"jade",
	"kite",
	"lake",
	"leaf",
	"lime",
	"mint",
	"moon",
	"nest",
	"nova",
	"oak",
	"onyx",
	"orb",
	"owl",
	"pine",
	"plum",
	"rain",
	"reed",
	"rock",
	"sage",
	"sand",
	"sea",
	"sky",
	"snow",
	"star",
	"sun",
	"tide",
	"vine",
	"wave",
	"wind",
	"wolf",
] as const;

export const MAX_SECRET_LENGTH = 10;

const SECRET_PATTERN = /^[a-z]+[0-9]+[a-z]+$/;

export function isValidControlSecret(secret: string): boolean {
	if (typeof secret !== "string") return false;
	if (secret.length === 0 || secret.length > MAX_SECRET_LENGTH) return false;
	if (!SECRET_PATTERN.test(secret)) return false;
	return true;
}

function pickWord(random: (max: number) => number): string {
	return SECRET_WORDS[random(SECRET_WORDS.length)]!;
}

function pickDigits(
	maxLen: number,
	random: (max: number) => number,
): string {
	const maxDigits = Math.min(3, Math.max(1, maxLen));
	const count = 1 + random(maxDigits);
	let out = "";
	for (let i = 0; i < count; i += 1) {
		out += String(random(10));
	}
	return out;
}

/**
 * word + digit(s) + word, ASCII, max 10 chars.
 */
export function generateControlSecret(
	random: (maxExclusive: number) => number = (max) => randomInt(max),
): string {
	for (let attempt = 0; attempt < 64; attempt += 1) {
		const left = pickWord(random);
		const right = pickWord(random);
		const remaining = MAX_SECRET_LENGTH - left.length - right.length;
		if (remaining < 1) continue;
		const mid = pickDigits(remaining, random);
		const secret = `${left}${mid}${right}`;
		if (isValidControlSecret(secret)) return secret;
	}
	throw new Error("Failed to generate a valid control secret.");
}

export function createWordDigitWordSecretGenerator(
	random?: (maxExclusive: number) => number,
): SecretGeneratorPort {
	return {
		generate: () => generateControlSecret(random),
	};
}

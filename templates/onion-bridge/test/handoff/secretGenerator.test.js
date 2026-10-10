import assert from "node:assert/strict";
import test from "node:test";
import {
	MAX_SECRET_LENGTH,
	generateControlSecret,
	isValidControlSecret,
} from "../../dist/handoff/secretGenerator.js";

test("isValidControlSecret enforces word+digits+word and max length", () => {
	assert.equal(isValidControlSecret("cat7dog"), true);
	assert.equal(isValidControlSecret("sea12oak"), true);
	assert.equal(isValidControlSecret(""), false);
	assert.equal(isValidControlSecret("cat-dog"), false);
	assert.equal(isValidControlSecret("Cat7dog"), false);
	assert.equal(isValidControlSecret("abcdefghijk"), false);
	assert.equal(isValidControlSecret("a1b"), true);
});

test("generateControlSecret always matches policy", () => {
	for (let i = 0; i < 40; i += 1) {
		const secret = generateControlSecret();
		assert.equal(isValidControlSecret(secret), true);
		assert.ok(secret.length <= MAX_SECRET_LENGTH);
		assert.match(secret, /^[a-z]+[0-9]+[a-z]+$/);
	}
});

test("generateControlSecret is deterministic with injected random", () => {
	let n = 0;
	const random = () => {
		const values = [0, 1, 0, 2, 3];
		return values[n++ % values.length];
	};
	const a = generateControlSecret(random);
	n = 0;
	const b = generateControlSecret(random);
	assert.equal(a, b);
	assert.equal(isValidControlSecret(a), true);
});

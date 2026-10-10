import assert from "node:assert/strict";
import test from "node:test";
import { createKeywordIntentPort } from "../../dist/handoff/keywordIntent.js";

test("keyword intent maps Korean utterances", async () => {
	const port = createKeywordIntentPort();
	assert.equal((await port.interpret("오늘 비번")).action, "rotate");
	assert.equal((await port.interpret("링크 줘")).action, "rotate");
	assert.equal((await port.interpret("서버 켜줘")).action, "up");
	assert.equal((await port.interpret("onion 서버 꺼")).action, "stop");
	assert.equal((await port.interpret("상태 어때")).action, "status");
	assert.equal((await port.interpret("날씨")).action, "unknown");
});

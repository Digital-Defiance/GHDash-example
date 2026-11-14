import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { getOAuth } from "../src/utils/github-oauth.mjs";

const file = (content) => {
	const p = join(mkdtempSync(join(tmpdir(), "oauth-")), "github-oauth.json");
	writeFileSync(p, typeof content === "string" ? content : JSON.stringify(content));
	return p;
};

test("a client ID and an https exchange address turn sign-in on; the example, a missing file and bad values keep it off", () => {
	assert.deepEqual(getOAuth(file({ clientId: "Iv1.abc123", exchangeUrl: "https://signin.me.workers.dev/" })), { clientId: "Iv1.abc123", exchangeUrl: "https://signin.me.workers.dev/" });
	assert.equal(getOAuth(join(tmpdir(), "nope.json")), null);
	assert.equal(getOAuth(file("{ nope")), null);
	assert.equal(getOAuth(file({ clientId: "Iv1.xxxxxxxxxxxxxxxx", exchangeUrl: "https://signin.me.workers.dev/" })), null);
	assert.equal(getOAuth(file({ clientId: "Iv1.abc", exchangeUrl: "https://ghdash-sign-in.example.com/" })), null);
	assert.equal(getOAuth(file({ clientId: "Iv1.abc", exchangeUrl: "http://signin.me.workers.dev/" })), null);
});

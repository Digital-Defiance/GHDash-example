import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("the team page lists members in order, with a filter and a page per member", () => {
	const html = readFileSync("dist/client/team/index.html", "utf8");
	const names = ["Ada Rivera", "Ben Okafor", "Chen Wu"].map((n) => html.indexOf(n));
	assert.ok(names.every((i) => i > 0), "all members listed");
	assert.deepEqual(names, names.toSorted((a, b) => a - b), "sorted by the order field");
	assert.match(html, /data-department="Engineering"/);
	const member = readFileSync("dist/client/team/ben-okafor/index.html", "utf8");
	assert.match(member, /Lead Developer/);
});

import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { getGiscus } from "../src/utils/giscus.mjs";

const file = (content) => {
	const p = join(mkdtempSync(join(tmpdir(), "giscus-")), "giscus.json");
	writeFileSync(p, typeof content === "string" ? content : JSON.stringify(content));
	return p;
};
const good = { repo: "o/r", repoId: "R_abc", category: "Announcements", categoryId: "DIC_abc" };

test("a complete config is used, with defaults for theme and language", () => {
	const g = getGiscus(file(good));
	assert.equal(g.repoId, "R_abc");
	assert.equal(g.mapping, "specific");
	assert.equal(g.theme, "preferred_color_scheme");
});

test("no file, bad JSON, missing values and the example placeholders mean comments are off", () => {
	assert.equal(getGiscus(join(tmpdir(), "does-not-exist.json")), null);
	assert.equal(getGiscus(file("{ nope")), null);
	assert.equal(getGiscus(file({ ...good, categoryId: "" })), null);
	assert.equal(getGiscus(file({ ...good, repoId: "R_xxxxxxxx", categoryId: "DIC_xxxxxxxx" })), null);
});

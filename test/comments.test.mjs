import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { commentsProvider, gitlabThread } from "../src/utils/comments.mjs";

const dir = mkdtempSync(join(tmpdir(), "comments-"));
const write = (name, value) => {
	const f = join(dir, name);
	writeFileSync(f, JSON.stringify(value));
	return f;
};
const onGitLab = write("gl.json", {
	provider: "gitlab",
	project: "g/site",
	webUrl: "https://gitlab.com",
	posts: { p1: { issueUrl: "https://gitlab.com/g/site/-/issues/1", open: false, comments: [{ id: 1, body: "hi" }] } },
});
const onGitHub = write("gh.json", { provider: "github", posts: {} });
const none = join(dir, "missing.json");

test("a repository on GitLab gets GitLab comments unless comments.json says otherwise", () => {
	assert.equal(commentsProvider({ settings: none, gitlab: onGitLab }), "gitlab");
	assert.equal(commentsProvider({ settings: write("off.json", { provider: "off" }), gitlab: onGitLab }), null);
	assert.equal(commentsProvider({ settings: none, gitlab: onGitHub }), null);
	assert.equal(commentsProvider({ settings: write("gl-wanted.json", { provider: "gitlab" }), gitlab: onGitHub }), null);
});

test("a post's thread lists its comments; a post without an issue links to a filled-in new issue", () => {
	const t = gitlabThread("p1", onGitLab);
	assert.equal(t.comments.length, 1);
	assert.equal(t.open, false);
	assert.equal(t.commentUrl, "https://gitlab.com/g/site/-/issues/1");
	const fresh = gitlabThread("p2", onGitLab);
	assert.deepEqual(fresh.comments, []);
	assert.equal(fresh.open, true);
	assert.equal(new URL(fresh.commentUrl).searchParams.get("issue[title]"), "Comments: p2");
	assert.equal(gitlabThread("p1", onGitHub), null);
});

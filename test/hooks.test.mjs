import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { eventsFromDiff, runHooks } from "@digitaldefiance/ghdash-pages/hooks";

const row = { id: "01A", slug: "hello", status: "published", title: "Hello", created_at: "t1", updated_at: "t2", published_at: "t3", draft_revision_id: "r1" };

test("webhook-notifier posts a new post to the configured URL with the token from the environment", async () => {
	const mod = await import("@emdash-cms/plugin-webhook-notifier/sandbox");
	const calls = [];
	const fetch = async (url, init) => { calls.push({ url, init }); return new Response("ok", { status: 200 }); };
	const events = eventsFromDiff("A\tcontent/ec_posts/01A.json", "HEAD", () => JSON.stringify(row));
	const results = await runHooks({
		plugins: [{ plugin: { id: "webhook-notifier" }, definition: mod.default, settings: { webhookUrl: { env: "WEBHOOK_URL" }, secretToken: { env: "WEBHOOK_TOKEN" }, enabled: true, events: "content", includeData: false } }],
		events,
		env: { WEBHOOK_URL: "https://hooks.example.test/in", WEBHOOK_TOKEN: "s3cret" },
		fetch,
	});
	assert.deepEqual(results.map((r) => r.ok), [true]);
	assert.equal(calls.length, 1);
	assert.equal(calls[0].url, "https://hooks.example.test/in");
	assert.equal(calls[0].init.headers.Authorization, "Bearer s3cret");
	const body = JSON.parse(calls[0].init.body);
	assert.equal(body.event, "content:create");
	assert.equal(body.collection, "posts");
	assert.equal(body.resourceId, "01A");
});

test("without a webhook URL the plugin does nothing", async () => {
	const mod = await import("@emdash-cms/plugin-webhook-notifier/sandbox");
	const calls = [];
	const events = eventsFromDiff("A\tcontent/ec_posts/01A.json", "HEAD", () => JSON.stringify(row));
	await runHooks({ plugins: [{ plugin: { id: "webhook-notifier" }, definition: mod.default, settings: { webhookUrl: { env: "WEBHOOK_URL" } } }], events, env: {}, fetch: async (...a) => { calls.push(a); return new Response("ok"); } });
	assert.deepEqual(calls, []);
});

test("run-hooks finds the changed content between two commits and runs the plugin", () => {
	const dir = mkdtempSync(join(tmpdir(), "hooks-"));
	const sh = (...args) => execFileSync("git", args, { cwd: dir, encoding: "utf8" });
	sh("init", "-q");
	sh("config", "user.email", "t@example.test");
	sh("config", "user.name", "t");
	mkdirSync(join(dir, "content/ec_posts"), { recursive: true });
	writeFileSync(join(dir, "package.json"), "{}");
	writeFileSync(join(dir, "plugin.mjs"), `import { appendFileSync } from "node:fs";\nexport default { hooks: { "content:afterSave": { handler: async (e, ctx) => appendFileSync("seen.txt", e.collection + ":" + e.content.id + ":" + e.isNew + ":" + (await ctx.kv.get("settings:mark")) + "\\n") } } };\n`);
	writeFileSync(join(dir, "hooks.config.json"), JSON.stringify({ plugins: [{ id: "p", module: "./plugin.mjs", settings: { mark: { env: "MARK" } } }] }));
	writeFileSync(join(dir, "content/ec_posts/01A.json"), JSON.stringify({ ...row, title: "One" }));
	sh("add", "-A");
	sh("commit", "-qm", "one");
	const base = sh("rev-parse", "HEAD").trim();
	writeFileSync(join(dir, "content/ec_posts/01A.json"), JSON.stringify({ ...row, title: "Two" }));
	writeFileSync(join(dir, "content/ec_posts/01B.json"), JSON.stringify({ ...row, id: "01B" }));
	sh("add", "-A");
	sh("commit", "-qm", "two");
	const bin = join(process.cwd(), "node_modules/@digitaldefiance/ghdash-pages/bin/ghdash-pages.mjs");
	execFileSync(process.execPath, [bin, "run-hooks", "--base", base, "--head", "HEAD"], { cwd: dir, env: { ...process.env, MARK: "yes" }, stdio: "pipe" });
	const seen = execFileSync("cat", ["seen.txt"], { cwd: dir, encoding: "utf8" }).trim().split("\n").sort();
	assert.deepEqual(seen, ["posts:01A:false:yes", "posts:01B:true:yes"]);
});

test("run-hooks with no base commit does nothing and succeeds", () => {
	const dir = mkdtempSync(join(tmpdir(), "hooks-"));
	writeFileSync(join(dir, "hooks.config.json"), JSON.stringify({ plugins: [] }));
	const bin = join(process.cwd(), "node_modules/@digitaldefiance/ghdash-pages/bin/ghdash-pages.mjs");
	const out = execFileSync(process.execPath, [bin, "run-hooks", "--base", "0000000000000000000000000000000000000000"], { cwd: dir, encoding: "utf8" });
	assert.match(out, /nothing to run/);
});

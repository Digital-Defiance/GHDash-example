import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { getContact } from "../src/utils/contact.mjs";
import { handleContact } from "../worker/contact-worker.mjs";

const file = (content) => {
	const p = join(mkdtempSync(join(tmpdir(), "contact-")), "contact.json");
	writeFileSync(p, typeof content === "string" ? content : JSON.stringify(content));
	return p;
};

test("an https endpoint turns the form on; no file, bad JSON, http and the placeholder keep it off", () => {
	assert.equal(getContact(file({ endpoint: "https://formspree.io/f/abc" })).endpoint, "https://formspree.io/f/abc");
	assert.equal(getContact(join(tmpdir(), "nope.json")), null);
	assert.equal(getContact(file("{ nope")), null);
	assert.equal(getContact(file({ endpoint: "http://forms.test/x" })), null);
	assert.equal(getContact(file({ endpoint: "https://example.com/replace-with-your-form-endpoint" })), null);
});

const env = { ALLOWED_ORIGIN: "https://me.github.io", TO_EMAIL: "me@x.test", FROM_EMAIL: "Form <f@x.test>", RESEND_API_KEY: "k" };
const post = (body, headers = {}) =>
	new Request("https://worker.test/", {
		method: "POST",
		headers: { origin: "https://me.github.io", "content-type": "application/json", accept: "application/json", ...headers },
		body: JSON.stringify(body),
	});
const good = { name: "Ann", email: "ann@x.test", message: "Hello" };
const mailer = () => {
	const calls = [];
	const impl = async (url, init) => {
		calls.push({ url, init });
		return new Response(JSON.stringify({ success: true }), { status: 200 });
	};
	return { calls, impl };
};

test("a valid submission is emailed with the sender as reply-to", async () => {
	const m = mailer();
	const res = await handleContact(post(good), env, m.impl);
	assert.equal(res.status, 200);
	assert.equal(res.headers.get("access-control-allow-origin"), env.ALLOWED_ORIGIN);
	assert.equal(m.calls.length, 1);
	const sent = JSON.parse(m.calls[0].init.body);
	assert.deepEqual(sent.to, ["me@x.test"]);
	assert.equal(sent.reply_to, "ann@x.test");
	assert.match(sent.text, /Hello/);
});

test("other origins, bad fields and oversize messages are refused without sending mail", async () => {
	const m = mailer();
	assert.equal((await handleContact(post(good, { origin: "https://evil.test" }), env, m.impl)).status, 403);
	assert.equal((await handleContact(post({ ...good, email: "nope" }), env, m.impl)).status, 400);
	assert.equal((await handleContact(post({ ...good, message: "" }), env, m.impl)).status, 400);
	assert.equal((await handleContact(post({ ...good, message: "x".repeat(5001) }), env, m.impl)).status, 400);
	assert.equal(m.calls.length, 0);
});

test("a filled honeypot looks successful but sends nothing", async () => {
	const m = mailer();
	const res = await handleContact(post({ ...good, _gotcha: "bot" }), env, m.impl);
	assert.equal(res.status, 200);
	assert.equal(m.calls.length, 0);
});

test("with a Turnstile secret, a failed check stops the message", async () => {
	const calls = [];
	const impl = async (url) => {
		calls.push(url);
		return new Response(JSON.stringify({ success: false }), { status: 200 });
	};
	const res = await handleContact(post(good), { ...env, TURNSTILE_SECRET: "s" }, impl);
	assert.equal(res.status, 400);
	assert.equal(calls.length, 1);
	assert.match(calls[0], /turnstile/);
});

test("a plain form post gets a thank-you page, and a mail failure is a 502", async () => {
	const form = new Request("https://worker.test/", {
		method: "POST",
		headers: { origin: "https://me.github.io" },
		body: new URLSearchParams(good),
	});
	const res = await handleContact(form, env, mailer().impl);
	assert.equal(res.status, 200);
	assert.match(res.headers.get("content-type"), /html/);
	const failing = async () => new Response("no", { status: 500 });
	assert.equal((await handleContact(post(good), env, failing)).status, 502);
});

test("preflight answers for the site's origin only", async () => {
	const res = await handleContact(new Request("https://worker.test/", { method: "OPTIONS" }), env);
	assert.equal(res.status, 204);
	assert.equal(res.headers.get("access-control-allow-origin"), env.ALLOWED_ORIGIN);
});

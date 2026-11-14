/**
 * Contact form endpoint for a Cloudflare Worker. It checks the submission and emails it to you
 * through Resend, so nothing is stored in your repository.
 *
 * Variables: ALLOWED_ORIGIN (your site, for example https://you.github.io), TO_EMAIL, FROM_EMAIL.
 * Secrets: RESEND_API_KEY, and optionally TURNSTILE_SECRET to require a Cloudflare Turnstile check.
 */

const MAX = { name: 200, email: 320, message: 5000 };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body, status, origin) =>
	new Response(JSON.stringify(body), {
		status,
		headers: {
			"content-type": "application/json",
			"access-control-allow-origin": origin,
			vary: "origin",
		},
	});

const thanks = () =>
	new Response("<!doctype html><meta charset=utf-8><title>Thanks</title><p>Thanks, your message was sent.</p>", {
		status: 200,
		headers: { "content-type": "text/html; charset=utf-8" },
	});

async function readFields(request) {
	const type = request.headers.get("content-type") ?? "";
	if (type.includes("application/json")) {
		const body = await request.json();
		return body && typeof body === "object" ? body : {};
	}
	return Object.fromEntries(await request.formData());
}

export function checkFields(fields) {
	const clean = {};
	for (const key of Object.keys(MAX)) {
		const value = typeof fields[key] === "string" ? fields[key].trim() : "";
		if (!value) return { error: `Missing ${key}` };
		if (value.length > MAX[key]) return { error: `${key} is too long` };
		clean[key] = value;
	}
	if (!EMAIL.test(clean.email)) return { error: "Invalid email address" };
	return { clean };
}

/** Handles one request. fetchImpl is injectable for tests. */
export async function handleContact(request, env, fetchImpl = fetch) {
	const origin = env.ALLOWED_ORIGIN;
	if (request.method === "OPTIONS") {
		return new Response(null, {
			status: 204,
			headers: {
				"access-control-allow-origin": origin,
				"access-control-allow-methods": "POST",
				"access-control-allow-headers": "content-type",
				"access-control-max-age": "86400",
			},
		});
	}
	if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405, origin);
	const sent = request.headers.get("origin");
	if (sent && sent !== origin) return json({ ok: false, error: "Origin not allowed" }, 403, origin);

	let fields;
	try {
		fields = await readFields(request);
	} catch {
		return json({ ok: false, error: "Could not read the form" }, 400, origin);
	}
	const wantsJson = (request.headers.get("accept") ?? "").includes("application/json");
	const reply = (body, status) => (wantsJson || status !== 200 ? json(body, status, origin) : thanks());

	// Real people leave the hidden field empty; bots fill it. Answer as if it worked.
	if (typeof fields._gotcha === "string" && fields._gotcha) return reply({ ok: true }, 200);

	const { clean, error } = checkFields(fields);
	if (error) return json({ ok: false, error }, 400, origin);

	if (env.TURNSTILE_SECRET) {
		const token = fields["cf-turnstile-response"];
		const check = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: typeof token === "string" ? token : "" }),
		});
		const result = await check.json().catch(() => ({}));
		if (!result.success) return json({ ok: false, error: "Check failed, please try again" }, 400, origin);
	}

	const subject = typeof fields.subject === "string" && fields.subject.trim() ? fields.subject.trim().slice(0, 150) : "New message from your site";
	const mail = await fetchImpl("https://api.resend.com/emails", {
		method: "POST",
		headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
		body: JSON.stringify({
			from: env.FROM_EMAIL,
			to: [env.TO_EMAIL],
			reply_to: clean.email,
			subject,
			text: `From: ${clean.name} <${clean.email}>\n\n${clean.message}`,
		}),
	});
	if (!mail.ok) return json({ ok: false, error: "Could not send the message" }, 502, origin);
	return reply({ ok: true }, 200);
}

export default { fetch: (request, env) => handleContact(request, env) };

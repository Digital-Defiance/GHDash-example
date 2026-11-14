import { existsSync, readFileSync } from "node:fs";

/** Reads contact.json from the site root. Returns null unless it holds an https endpoint that is not the example placeholder. */
export function getContact(file = "contact.json") {
	if (!existsSync(file)) return null;
	let config;
	try {
		config = JSON.parse(readFileSync(file, "utf8"));
	} catch {
		return null;
	}
	let url;
	try {
		url = new URL(config.endpoint);
	} catch {
		return null;
	}
	if (url.protocol !== "https:" || /(^|\.)example\.(com|org|net)$/i.test(url.hostname)) return null;
	return {
		endpoint: url.href,
		subject: typeof config.subject === "string" ? config.subject : "",
		turnstileSiteKey: typeof config.turnstileSiteKey === "string" ? config.turnstileSiteKey : "",
	};
}

import { existsSync, readFileSync } from "node:fs";

/** Reads github-oauth.json from the site root. Returns null unless it holds a client ID and an https exchange address that are not the example placeholders. */
export function getOAuth(file = "github-oauth.json") {
	if (!existsSync(file)) return null;
	let config;
	try {
		config = JSON.parse(readFileSync(file, "utf8"));
	} catch {
		return null;
	}
	if (typeof config.clientId !== "string" || !config.clientId.trim() || /^(Iv\d+\.)?x+$/i.test(config.clientId)) return null;
	let url;
	try {
		url = new URL(config.exchangeUrl);
	} catch {
		return null;
	}
	if (url.protocol !== "https:" || /(^|\.)example\.(com|org|net)$/i.test(url.hostname)) return null;
	return { clientId: config.clientId.trim(), exchangeUrl: url.href };
}

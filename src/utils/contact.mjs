import { existsSync, readFileSync } from "node:fs";

/**
 * Reads contact.json from the site root. Returns null unless it holds either an https endpoint (not the example placeholder) or
 * an issueRepo ("owner/name") whose public GitHub issues take the messages, or an issueProject ("group/project") whose public
 * GitLab issues do (on issueHost, default https://gitlab.com).
 */
export function getContact(file = "contact.json") {
	if (!existsSync(file)) return null;
	let config;
	try {
		config = JSON.parse(readFileSync(file, "utf8"));
	} catch {
		return null;
	}
	if (typeof config.issueRepo === "string" && /^[\w.-]+\/[\w.-]+$/.test(config.issueRepo) && !/^your-name\//i.test(config.issueRepo)) {
		return { kind: "issue", repo: config.issueRepo, label: typeof config.issueLabel === "string" ? config.issueLabel : "contact", subject: "", turnstileSiteKey: "", endpoint: "" };
	}
	if (typeof config.issueProject === "string" && /^[\w.-]+(\/[\w.-]+)+$/.test(config.issueProject) && !/^your-name\//i.test(config.issueProject)) {
		let host;
		try {
			host = new URL(config.issueHost || "https://gitlab.com");
		} catch {
			return null;
		}
		if (host.protocol !== "https:") return null;
		return { kind: "issue", host: "gitlab", hostUrl: host.origin, repo: config.issueProject, label: "", subject: "", turnstileSiteKey: "", endpoint: "" };
	}
	let url;
	try {
		url = new URL(config.endpoint);
	} catch {
		return null;
	}
	if (url.protocol !== "https:" || /(^|\.)example\.(com|org|net)$/i.test(url.hostname)) return null;
	return {
		kind: "form",
		endpoint: url.href,
		subject: typeof config.subject === "string" ? config.subject : "",
		turnstileSiteKey: typeof config.turnstileSiteKey === "string" ? config.turnstileSiteKey : "",
	};
}

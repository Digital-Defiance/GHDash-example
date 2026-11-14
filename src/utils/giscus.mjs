import { existsSync, readFileSync } from "node:fs";

const REQUIRED = ["repo", "repoId", "category", "categoryId"];

/** Reads giscus.json from the site root. Returns null unless every required value is set. */
export function getGiscus(file = "giscus.json") {
	if (!existsSync(file)) return null;
	let config;
	try {
		config = JSON.parse(readFileSync(file, "utf8"));
	} catch {
		return null;
	}
	if (!REQUIRED.every((k) => typeof config[k] === "string" && config[k].trim() && !/^(R|DIC)_x+$/i.test(config[k]))) return null;
	return { ...config, mapping: "specific", theme: config.theme ?? "preferred_color_scheme", lang: config.lang ?? "en" };
}

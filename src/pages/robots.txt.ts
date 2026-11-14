import type { APIRoute } from "astro";

import { siteUrl } from "../utils/site-url";

export const GET: APIRoute = ({ site, url }) => {
	const origin = site ?? new URL(url.origin);
	const lines = ["User-agent: *", "Allow: /", "Disallow: /studio/", "Disallow: /admin/", "", `Sitemap: ${siteUrl(origin, "/sitemap.xml")}`, ""];
	return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};

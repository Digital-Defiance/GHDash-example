const base = (process.env.BASE_PATH ?? "").replace(/\/+$/, "");

/** Absolute URL for a site path, including the GitHub Pages project base path. */
export function siteUrl(origin: URL | string, path: string): string {
	return new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`, origin).href;
}

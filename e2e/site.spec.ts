import { existsSync } from "node:fs";

import { expect, test } from "@playwright/test";

const pages = ["", "posts/", "pages/about/", "category/development/", "tag/creativity/", "rss.xml"];

test.describe("static site", () => {
	for (const path of pages) {
		test(`/${path} renders`, async ({ page }) => {
			const failed: string[] = [];
			page.on("requestfailed", (r) => failed.push(r.url()));
			const res = await page.goto(path);
			expect(res?.status(), path).toBe(200);
			expect(failed).toEqual([]);
		});
	}

	test("internal links keep the base path", async ({ page }) => {
		await page.goto("");
		const hrefs = await page.locator("a[href^='/']").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
		expect(hrefs.length).toBeGreaterThan(0);
		for (const h of hrefs) expect(h.startsWith("/GHDash-example/"), h).toBe(true);
	});

	test("a post page shows its title", async ({ page }) => {
		await page.goto("posts/");
		const first = page.locator("a[href*='/posts/']").first();
		const title = (await first.innerText()).trim();
		await first.click();
		await expect(page.locator("h1").first()).toContainText(title.split("\n")[0]!.slice(0, 20));
	});

	test("a long archive is split into pages with plain links", async ({ page }) => {
		await page.goto("posts/");
		const next = page.getByRole("link", { name: /Older posts/ });
		test.skip((await next.count()) === 0, "built with a page size that fits every post on one page");
		await expect(page.getByText(/^Page 1 of \d+$/)).toBeVisible();
		await next.click();
		await expect(page).toHaveURL(/\/posts\/page\/2\/?$/);
		await expect(page.getByText(/^Page 2 of \d+$/)).toBeVisible();
		await page.getByRole("link", { name: /Newer posts/ }).click();
		await expect(page).toHaveURL(/\/posts\/?$/);
	});

	test("search finds a post and links to it under the base path", async ({ page }) => {
		await page.goto("search/");
		await page.locator("#search-query").fill("weekend");
		await page.locator("#search-form").getByRole("button", { name: "Search" }).click();
		const link = page.locator("#search-list a").first();
		await expect(link).toContainText(/weekend/i);
		expect(await link.getAttribute("href")).toMatch(/^\/GHDash-example\/posts\/.+/);
		await link.click();
		await expect(page.locator("h1").first()).toContainText(/weekend/i);
	});

	test("search says so when nothing matches", async ({ page }) => {
		await page.goto("search/?q=zzzzqqqq");
		await expect(page.getByText(/No results for/)).toBeVisible();
	});

	test("sitemap, robots and the feed use absolute URLs under the base path", async ({ request, baseURL }) => {
		const origin = new URL(baseURL!).origin;
		const sitemap = await (await request.get("sitemap.xml")).text();
		const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
		expect(locs.length).toBeGreaterThan(3);
		for (const l of locs) expect(l.startsWith(`${origin}/GHDash-example/`), l).toBe(true);
		const robots = await (await request.get("robots.txt")).text();
		expect(robots).toContain(`Sitemap: ${origin}/GHDash-example/sitemap.xml`);
		expect(robots).toContain("Disallow: /studio/");
		const rss = await (await request.get("rss.xml")).text();
		expect(rss).toMatch(/<link>[^<]*\/GHDash-example\/posts\/[^<]+<\/link>/);
	});

	test("a post shows the discussion thread only when giscus is configured", async ({ page }) => {
		await page.goto("posts/notes-on-simplicity/");
		const script = page.locator('script[src="https://giscus.app/client.js"]');
		if (existsSync("giscus.json")) {
			await expect(script).toHaveAttribute("data-term", "notes-on-simplicity");
			await expect(page.getByRole("heading", { name: "Discussion" })).toBeVisible();
		} else {
			await expect(script).toHaveCount(0);
			await expect(page.getByRole("heading", { name: "Discussion" })).toHaveCount(0);
		}
	});
});

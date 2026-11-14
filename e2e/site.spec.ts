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
});

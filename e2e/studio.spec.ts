import { existsSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import { BASE } from "./base";

function watch(page: Page) {
	const problems: string[] = [];
	page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
	page.on("console", (m) => {
		const t = m.text();
		if (t.includes("[browser-api]") || t.includes("Content Security Policy")) problems.push(t.slice(0, 200));
	});
	return problems;
}

async function open(page: Page) {
	await page.goto("studio/");
	await expect(page.getByRole("link", { name: "Posts" }).first()).toBeVisible({ timeout: 30_000 });
}

test.describe("studio (real admin, in-browser API)", () => {
	test.skip(!existsSync("dist/client/studio-api/entry.js"), "browser API bundle not built into dist/client/studio-api");

	test("View Site links to the site under its base path", async ({ page }) => {
		await open(page);
		await expect(page.getByRole("link", { name: "View Site" })).toHaveAttribute("href", `${BASE}/`);
	});

	test("loads with the site's collections and no missing routes", async ({ page }) => {
		const problems = watch(page);
		await open(page);
		for (const name of ["Pages", "Posts", "Categories", "Tags"]) {
			await expect(page.getByRole("link", { name, exact: true }).first()).toBeVisible();
		}
		await expect(page.getByText("Could not load dashboard data")).toHaveCount(0);
		expect(problems).toEqual([]);
	});

	test("lists the posts from content/", async ({ page }) => {
		await open(page);
		await page.getByRole("link", { name: "Posts" }).first().click();
		await expect(page.getByText("Notes on Simplicity")).toBeVisible();
		await expect(page.getByText("The Case for Static")).toBeVisible();
	});

	test("every sidebar page loads without API errors", async ({ page }) => {
		const problems = watch(page);
		await open(page);
		for (const name of ["Calendar", "Media", "Comments", "Menus", "Redirects", "Widgets", "Sections", "Categories", "Tags", "Bylines", "Content Types", "Plugins", "Settings"]) {
			await page.getByRole("link", { name, exact: true }).first().click();
			await expect(page.getByRole("heading", { name }).first()).toBeVisible({ timeout: 15_000 });
		}
		expect(problems).toEqual([]);
	});

	test("editing a draft post saves and persists in the session", async ({ page }) => {
		const problems = watch(page);
		await open(page);
		await page.getByRole("link", { name: "Posts" }).first().click();
		await page.getByText("Work in Progress").first().click();
		const title = page.getByLabel("Title").first();
		await title.fill("Work in Progress (edited)");
		await page.getByRole("button", { name: /^Save/ }).first().click();
		await expect(page.getByText("Saved")).toBeVisible();
		await page.getByRole("link", { name: "Posts" }).first().click();
		await page.getByText(/Work in Progress/).first().click();
		await expect(page.getByLabel("Title").first()).toHaveValue("Work in Progress (edited)");
		expect(problems).toEqual([]);
	});

	test("creating a post adds it to the list", async ({ page }) => {
		const problems = watch(page);
		await open(page);
		await page.getByRole("link", { name: "Posts" }).first().click();
		await page.getByRole("link", { name: /Add New/ }).first().click();
		await page.getByLabel("Title").first().fill("Created by the e2e suite");
		await page.getByRole("button", { name: /^Save/ }).first().click();
		await expect(page.getByText("Saved")).toBeVisible();
		await page.getByRole("link", { name: "Posts" }).first().click();
		await expect(page.getByText("Created by the e2e suite")).toBeVisible();
		expect(problems).toEqual([]);
	});

	test("a deep link survives a refresh", async ({ page }) => {
		await page.goto("studio/content/posts");
		await expect(page.getByRole("link", { name: "Posts" }).first()).toBeVisible({ timeout: 30_000 });
	});

	test("the Plugins screen lists the installed plugins", async ({ page }) => {
		await page.goto("studio/?p=plugins-manager");
		await expect(page.getByText("Manage installed plugins")).toBeVisible({ timeout: 30_000 });
		await expect(page.getByText("2 plugins")).toBeVisible();
		await expect(page.getByText("color", { exact: true })).toBeVisible();
		await expect(page.getByText("field-kit", { exact: true })).toBeVisible();
	});

	test("a field that uses the color plugin's widget renders it, and survives a reload", async ({ page }) => {
		const problems = watch(page);
		await open(page);
		const status = await page.evaluate(async () => {
			const p = (globalThis as any).__EMDASH_PATHS__;
			const res = await p.fetch(p.apiBase + "/schema/collections/posts/fields", {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-EmDash-Request": "1" },
				body: JSON.stringify({ slug: "accent_color", label: "Accent color", type: "string", widget: "color:picker" }),
			});
			return res.status;
		});
		expect(status).toBe(201);
		await expect(page.getByTestId("tray-count")).not.toHaveText("0");
		await page.reload();
		await expect(page.getByRole("link", { name: "Posts" }).first()).toBeVisible({ timeout: 30_000 });
		await page.getByRole("link", { name: "Posts" }).first().click();
		await page.getByText(/Work in Progress/).first().click();
		await expect(page.getByText("Accent color")).toBeVisible();
		await expect(page.locator("input[type=color]")).toHaveCount(1);
		expect(problems).toEqual([]);
	});

	test("a field that uses the field-kit tags widget renders it", async ({ page }) => {
		const problems = watch(page);
		await open(page);
		const status = await page.evaluate(async () => {
			const p = (globalThis as any).__EMDASH_PATHS__;
			const res = await p.fetch(p.apiBase + "/schema/collections/posts/fields", {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-EmDash-Request": "1" },
				body: JSON.stringify({ slug: "keywords", label: "Keywords", type: "json", widget: "field-kit:tags" }),
			});
			return res.status;
		});
		expect(status).toBe(201);
		await expect(page.getByTestId("tray-count")).not.toHaveText("0");
		await page.reload();
		await expect(page.getByRole("link", { name: "Posts" }).first()).toBeVisible({ timeout: 30_000 });
		await page.getByRole("link", { name: "Posts" }).first().click();
		await page.getByText(/Work in Progress/).first().click();
		await expect(page.getByPlaceholder("Add...")).toBeVisible();
		expect(problems).toEqual([]);
	});
});

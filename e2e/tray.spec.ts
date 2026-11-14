import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

test.skip(!existsSync("dist/client/studio-api/entry.js"), "browser API bundle not built into dist/client/studio-api");

const contentFiles = (dir = "content", prefix = ""): Record<string, string> =>
	Object.fromEntries(
		readdirSync(dir).flatMap((n) => {
			const p = join(dir, n);
			return statSync(p).isDirectory() ? Object.entries(contentFiles(p, `${prefix}${n}/`)) : [[`${prefix}${n}`, readFileSync(p, "utf8")]];
		}),
	);

type Fake = { head: string; commits: Array<{ message: string; tree: Array<{ path: string; content?: string | null; sha?: string | null }>; parent: string }>; remoteFiles?: Record<string, string>; uploaded?: Buffer[] };

/** A just-enough GitHub API: access check, ref, commit, tree, blob, and fast-forward or conflict on update. */
async function fakeGitHub(page: Page, fake: Fake) {
	const blobs = new Map<string, string>();
	await page.route("https://api.github.com/**", async (route) => {
		const req = route.request();
		const path = new URL(req.url()).pathname.replace(/^\/repos\/[^/]+\/[^/]+/, "");
		const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
		if (req.method() === "GET" && path === "") return json({ permissions: { push: true }, default_branch: "main" });
		if (req.method() === "GET" && path.startsWith("/git/ref/heads/")) return json({ object: { sha: fake.head } });
		if (req.method() === "GET" && path.startsWith("/git/commits/")) return json({ tree: { sha: "tree0" } });
		if (req.method() === "GET" && path.startsWith("/git/trees/")) {
			const files = fake.remoteFiles ?? {};
			return json({ tree: Object.keys(files).map((p) => { const sha = `blob-${p}`; blobs.set(sha, files[p]!); return { type: "blob", path: `content/${p}`, sha }; }) });
		}
		if (req.method() === "GET" && path.startsWith("/git/blobs/")) {
			const text = blobs.get(decodeURIComponent(path.slice("/git/blobs/".length)))!;
			return json({ content: Buffer.from(text).toString("base64"), encoding: "base64" });
		}
		if (req.method() === "POST" && path === "/git/blobs") {
			const sha = `blob-new-${fake.uploaded?.length ?? 0}`;
			(fake.uploaded ??= []).push(Buffer.from(req.postDataJSON().content, "base64"));
			return json({ sha });
		}
		if (req.method() === "POST" && path === "/git/trees") { (fake as any)._tree = req.postDataJSON().tree; return json({ sha: "tree1" }); }
		if (req.method() === "POST" && path === "/git/commits") {
			const body = req.postDataJSON();
			fake.commits.push({ message: body.message, tree: (fake as any)._tree, parent: body.parents[0] });
			return json({ sha: `commit${fake.commits.length}` });
		}
		if (req.method() === "PATCH" && path.startsWith("/git/refs/heads/")) { fake.head = req.postDataJSON().sha; return json({}); }
		return json({ message: `unhandled ${req.method()} ${path}` }, 500);
	});
}

async function headOfSite(page: Page) {
	const res = await page.request.get("studio-data/content.json");
	return (await res.json()).meta.head as string;
}

async function openStudio(page: Page) {
	await page.goto("studio/");
	await expect(page.getByTestId("tray-button")).toBeVisible({ timeout: 30_000 });
}

async function editWorkInProgress(page: Page, title: string) {
	await page.getByRole("link", { name: "Posts" }).first().click();
	await page.getByText(/Work in Progress|Tray edit/).first().click();
	await page.getByLabel("Title").first().fill(title);
	await page.getByRole("button", { name: /^Save/ }).first().click();
	await expect(page.getByText("Saved")).toBeVisible();
}

async function upload(page: Page, name: string, buffer: Buffer) {
	await page.getByRole("button", { name: "Upload Files" }).first().click();
	await page.getByLabel("Browse files to upload").setInputFiles({ name, mimeType: "image/png", buffer });
	await expect(page.getByTestId("tray-count")).toHaveText("1");
	await page.keyboard.press("Escape");
}

test.describe("pending-changes tray", () => {
	test("starts empty, counts an edit, and discard puts it back", async ({ page }) => {
		await openStudio(page);
		await expect(page.getByTestId("tray-count")).toHaveText("0");
		await editWorkInProgress(page, "Tray edit");
		await expect(page.getByTestId("tray-count")).toHaveText("1");
		await page.getByTestId("tray-button").click();
		await expect(page.getByTestId("tray-list")).toContainText("Edited");
		await expect(page.getByTestId("tray-list")).toContainText("Tray edit");
		await page.getByRole("button", { name: "Discard Tray edit" }).click();
		await expect(page.getByTestId("tray-count")).toHaveText("0");
	});

	test("pending changes survive a reload", async ({ page }) => {
		await openStudio(page);
		await editWorkInProgress(page, "Tray edit");
		await expect(page.getByTestId("tray-count")).toHaveText("1");
		await page.reload();
		await expect(page.getByTestId("tray-button")).toBeVisible({ timeout: 30_000 });
		await expect(page.getByTestId("tray-count")).toHaveText("1");
	});

	test("commit sends the changed rows as one commit", async ({ page }) => {
		const fake: Fake = { head: await headOfSite(page), commits: [] };
		await fakeGitHub(page, fake);
		const parent = fake.head;
		await openStudio(page);
		await editWorkInProgress(page, "Tray edit");
		await page.getByTestId("tray-button").click();
		await page.getByLabel(/GitHub token/).fill("ghp_faketoken");
		await page.getByRole("button", { name: "Sign in" }).click();
		await page.getByLabel("Commit message").fill("Edit the draft");
		await page.getByRole("button", { name: /^Commit/ }).click();
		await expect(page.getByTestId("tray-done")).toBeVisible();
		expect(fake.commits).toHaveLength(1);
		expect(fake.commits[0]!.message).toBe("Edit the draft");
		expect(fake.commits[0]!.parent).toBe(parent);
		expect(fake.commits[0]!.tree).toHaveLength(1);
		expect(fake.commits[0]!.tree[0]!.path).toMatch(/^content\/ec_posts\/.+\.json$/);
		expect(JSON.parse(fake.commits[0]!.tree[0]!.content!).title).toBe("Tray edit");
		await expect(page.getByTestId("tray-count")).toHaveText("0");
	});

	test("a moved branch keeps my changes and merges the upstream ones", async ({ page }) => {
		const files = contentFiles();
		const others = Object.keys(files).filter((p) => p.startsWith("ec_posts/") && !files[p]!.includes("Work in Progress"));
		const theirs = JSON.parse(files[others[0]!]!);
		const remoteFiles = { ...files, [others[0]!]: JSON.stringify({ ...theirs, title: "Changed upstream" }, null, "\t") + "\n" };
		const fake: Fake = { head: "someone-else-pushed", commits: [], remoteFiles };
		await fakeGitHub(page, fake);
		await openStudio(page);
		await editWorkInProgress(page, "Tray edit");
		await page.getByTestId("tray-button").click();
		await page.getByLabel(/GitHub token/).fill("ghp_faketoken");
		await page.getByRole("button", { name: "Sign in" }).click();
		await page.getByRole("button", { name: /^Commit/ }).click();
		await expect(page.getByRole("alert")).toContainText("Someone changed");
		expect(fake.commits).toHaveLength(0);
		await page.getByRole("button", { name: /Update my copy/ }).click();
		await expect(page.getByTestId("tray-list")).toContainText("Tray edit");
		await expect(page.getByTestId("tray-list")).not.toContainText("Changed upstream");
		await page.getByRole("link", { name: "Posts" }).first().click();
		await expect(page.getByText("Changed upstream")).toBeVisible();
		await page.getByTestId("tray-button").click();
		await page.getByRole("button", { name: /^Commit/ }).click();
		await expect(page.getByTestId("tray-done")).toBeVisible();
		expect(fake.commits).toHaveLength(1);
		expect(fake.commits[0]!.parent).toBe("someone-else-pushed");
		expect(fake.commits[0]!.tree).toHaveLength(1);
	});

	test("an uploaded image is listed as a pending file, kept across a reload, and committed as bytes", async ({ page }) => {
		const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
		const fake: Fake = { head: await headOfSite(page), commits: [] };
		await fakeGitHub(page, fake);
		await openStudio(page);
		await page.getByRole("link", { name: "Media" }).first().click();
		await upload(page, "pixel.png", png);
		await expect(page.getByTestId("tray-count")).toHaveText("1");
		await page.getByTestId("tray-button").click();
		await expect(page.getByTestId("tray-list")).toContainText("pixel.png");
		await expect(page.getByTestId("tray-list")).toContainText("New");
		await page.reload();
		await expect(page.getByTestId("tray-button")).toBeVisible({ timeout: 30_000 });
		await expect(page.getByTestId("tray-count")).toHaveText("1");
		await page.getByTestId("tray-button").click();
		await page.getByLabel(/GitHub token/).fill("ghp_faketoken");
		await page.getByRole("button", { name: "Sign in" }).click();
		await page.getByRole("button", { name: /^Commit/ }).click();
		await expect(page.getByTestId("tray-done")).toBeVisible();
		const paths = fake.commits[0]!.tree.map((t) => t.path);
		expect(paths.some((p) => /^media\/.+\.png$/.test(p))).toBe(true);
		expect(paths).toContain("content/media.json");
		expect(fake.uploaded).toHaveLength(1);
		expect(fake.uploaded![0]!.equals(png)).toBe(true);
	});

	test("discarding a pending upload removes the file and its media entry", async ({ page }) => {
		const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
		await openStudio(page);
		await page.getByRole("link", { name: "Media" }).first().click();
		await upload(page, "gone.png", png);
		await expect(page.getByTestId("tray-count")).toHaveText("1");
		await page.getByTestId("tray-button").click();
		await page.getByRole("button", { name: "Discard gone.png" }).click();
		await expect(page.getByTestId("tray-count")).toHaveText("0");
	});
});

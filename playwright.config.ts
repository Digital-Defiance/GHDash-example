import { defineConfig } from "@playwright/test";

const port = 4400;
export default defineConfig({
	testDir: "e2e",
	timeout: 60_000,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [["github"], ["list"]] : "list",
	use: { baseURL: `http://localhost:${port}/GHDash-example/`, trace: "off" },
	webServer: {
		command: "node scripts/serve-dist.mjs",
		url: `http://localhost:${port}/GHDash-example/`,
		reuseExistingServer: !process.env.CI,
		env: { BASE_PATH: "/GHDash-example", PORT: String(port) },
	},
});

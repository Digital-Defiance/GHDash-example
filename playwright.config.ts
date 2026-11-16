import { defineConfig } from "@playwright/test";

import { BASE } from "./e2e/base";

const port = 4400;
export default defineConfig({
	testDir: "e2e",
	timeout: 60_000,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [["github"], ["list"]] : "list",
	use: { baseURL: `http://localhost:${port}${BASE}/`, trace: "off" },
	webServer: {
		command: "npx gitdash-pages serve",
		url: `http://localhost:${port}${BASE}/`,
		reuseExistingServer: !process.env.CI,
		env: { BASE_PATH: BASE, PORT: String(port) },
	},
});

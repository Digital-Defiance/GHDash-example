import "@emdash-cms/admin/styles.css";
import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import { createRoot } from "react-dom/client";

import { createBrowserApi, Kysely, SqliteDialect } from "./api.js";
import { openDb } from "./load-db.js";

const paths = (globalThis as any).__EMDASH_PATHS__ as { adminBase: string; apiBase: string };
const root = document.getElementById("admin-root")!;
root.textContent = "Loading site data…";

const site = paths.apiBase.replace(/\/_api$/, "");
const [sqlite, content, empty] = await Promise.all([
	sqlite3InitModule({ print() {}, printErr() {} }),
	fetch(`${site}/studio-data/content.json`).then((r) => r.json()),
	fetch(`${site}/studio-data/empty.db`).then((r) => r.arrayBuffer()),
]);
const { database } = openDb(sqlite, empty, content);
const db = new Kysely({ dialect: new SqliteDialect({ database }) });
const realFetch = globalThis.fetch.bind(globalThis);
const api = createBrowserApi({
	db,
	apiBase: paths.apiBase,
	user: { id: "github-user", email: "editor@users.noreply.github.com", name: "GitHub editor" },
	passthrough: realFetch,
});
(globalThis as any).__EMDASH_PATHS__ = { ...paths, fetch: api };

const { AdminApp } = await import("@emdash-cms/admin");
const { loadMessages } = await import("@emdash-cms/admin/locales");
const messages = await loadMessages("en");
root.textContent = "";
createRoot(root).render(<AdminApp locale="en" messages={messages} />);

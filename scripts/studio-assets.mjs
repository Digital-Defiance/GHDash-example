// Writes the data the in-browser admin loads: public/studio-data/{content.json,empty.db}.
// Run after `npm run db`. content.json is the repo's content/ tree as one file.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = "public/studio-data";
mkdirSync(out, { recursive: true });
const dir = "content";
const ddl = JSON.parse(readFileSync(join(dir, "_ddl.json"), "utf8"));
const tables = {};
for (const n of readdirSync(dir).sort()) {
	if (n === "_ddl.json") continue;
	const q = join(dir, n);
	tables[n.replace(/\.json$/, "")] = statSync(q).isDirectory()
		? readdirSync(q).sort().map((f) => JSON.parse(readFileSync(join(q, f), "utf8")))
		: JSON.parse(readFileSync(q, "utf8"));
}
writeFileSync(join(out, "content.json"), JSON.stringify({ ddl, tables }));
execFileSync("node", ["scripts/make-empty-db.mjs", "data.db", dir, join(out, "empty.db")], { stdio: "inherit" });

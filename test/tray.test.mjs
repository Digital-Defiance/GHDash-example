// node --test test/   (needs `npm run db && ghdash-pages studio-assets` first)
import init from "@sqlite.org/sqlite-wasm";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { before, test } from "node:test";

import { openDb } from "@digital-defiance/ghdash-pages/studio/load-db.js";
import { applyFile, diffFiles, filesFromContent, mergeRemote, snapshot } from "@digital-defiance/ghdash-pages/studio/tray.js";

let sqlite, content, empty;
before(async () => {
	sqlite = await init({ print() {}, printErr() {} });
	content = JSON.parse(readFileSync("public/studio-data/content.json", "utf8"));
	empty = readFileSync("public/studio-data/empty.db");
});
const open = () => openDb(sqlite, empty, content);

test("a freshly loaded database has no pending changes", () => {
	const { db, freshNames } = open();
	assert.deepEqual(diffFiles(filesFromContent(content), snapshot(db, freshNames)), []);
});

test("the snapshot is byte-identical to the files in content/", () => {
	const { db, freshNames } = open();
	for (const [path, text] of snapshot(db, freshNames)) assert.equal(readFileSync(`content/${path}`, "utf8"), text, path);
});

test("an edit shows as modified and discarding it restores the baseline", () => {
	const { db, freshNames } = open();
	const base = snapshot(db, freshNames);
	db.exec("update ec_posts set title = 'Changed' where slug = 'work-in-progress'");
	const diff = diffFiles(base, snapshot(db, freshNames));
	assert.equal(diff.length, 1);
	assert.equal(diff[0].kind, "modified");
	assert.equal(diff[0].label, "Changed");
	applyFile(db, diff[0].path, base.get(diff[0].path));
	assert.deepEqual(diffFiles(base, snapshot(db, freshNames)), []);
});

test("a new row is added, and deleting a row is a deletion", () => {
	const { db, freshNames } = open();
	const base = snapshot(db, freshNames);
	db.exec("delete from ec_posts where slug = 'work-in-progress'");
	const diff = diffFiles(base, snapshot(db, freshNames));
	assert.deepEqual(diff.map((d) => d.kind), ["deleted"]);
	applyFile(db, diff[0].path, base.get(diff[0].path));
	assert.deepEqual(diffFiles(base, snapshot(db, freshNames)), []);
});

test("entry locks and other transient tables never show up", () => {
	const { db, freshNames } = open();
	const base = snapshot(db, freshNames);
	const lock = "_emdash_entry_locks";
	assert.ok(db.selectValue("select count(*) from sqlite_master where name = ?", [lock]), "expected the entry lock table");
	const cols = db.selectObjects(`pragma table_info("${lock}")`);
	const values = cols.map((c) => (c.type.toUpperCase().includes("INT") ? 1 : "x"));
	db.exec({ sql: `insert into "${lock}" (${cols.map((c) => `"${c.name}"`)}) values (${cols.map(() => "?")})`, bind: values });
	assert.equal(db.selectValue(`select count(*) from "${lock}"`), 1);
	assert.deepEqual(diffFiles(base, snapshot(db, freshNames)), []);
});

test("mergeRemote takes remote-only changes and keeps clashing local ones", () => {
	const { db, freshNames } = open();
	const oldBase = snapshot(db, freshNames);
	const remote = new Map(oldBase);
	const [a, b] = [...oldBase.keys()].filter((p) => p.startsWith("ec_posts/"));
	const edit = (text, title) => JSON.stringify({ ...JSON.parse(text), title }, null, "\t") + "\n";
	remote.set(a, edit(oldBase.get(a), "Remote A"));
	remote.set(b, edit(oldBase.get(b), "Remote B"));
	const idB = b.split("/")[1].replace(".json", "");
	db.exec({ sql: "update ec_posts set title = 'Local B' where id = ?", bind: [idB] });
	const clashes = mergeRemote(db, oldBase, remote, snapshot(db, freshNames));
	assert.deepEqual(clashes, [b]);
	const idA = a.split("/")[1].replace(".json", "");
	assert.equal(db.selectValue("select title from ec_posts where id = ?", [idA]), "Remote A");
	assert.equal(db.selectValue("select title from ec_posts where id = ?", [idB]), "Local B");
});

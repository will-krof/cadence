import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

test("owner backfill reuses only active profiles in the owner's own workspace", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "cadence-owner-team-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const db = path.join(dir, "test.db");
  writeFileSync(db, "");
  const execute = (input) => {
    const result = spawnSync(process.execPath,
      ["scripts/prisma.mjs", "db", "execute", "--stdin"],
      { env: { ...process.env, DATABASE_URL: `file:${db}` }, input, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);
  };
  execute(`
    CREATE TABLE "User" (id TEXT PRIMARY KEY, name TEXT, email TEXT NOT NULL);
    CREATE TABLE "Developer" (id TEXT PRIMARY KEY, "userId" TEXT NOT NULL,
      name TEXT NOT NULL, email TEXT, active BOOLEAN NOT NULL DEFAULT true);
    INSERT INTO "User" VALUES
      ('new', 'New Owner', 'new@example.com'),
      ('existing', 'Existing Owner', 'existing@example.com'),
      ('archived', '', 'archived@example.com');
    INSERT INTO "Developer" VALUES
      ('existing-profile', 'existing', 'Manual profile', 'EXISTING@example.com', true),
      ('foreign-profile', 'existing', 'Different workspace', 'new@example.com', true),
      ('archived-profile', 'archived', 'Archived profile', 'archived@example.com', false);
  `);
  const migration = readFileSync(new URL("../prisma/migrations/20261112140000_owner_on_team/migration.sql", import.meta.url), "utf8");
  execute(migration);
  execute(migration);
  // SQL checks fail the test if the migration duplicates or misattributes a
  // person, loses the signup name, or leaves an owner impossible to assign.
  execute(`
    CREATE TEMP TABLE checks (ok INTEGER CHECK (ok = 1));
    INSERT INTO checks SELECT COUNT(*) FROM "Developer" WHERE "userId" = 'new' AND name = 'New Owner' AND email = 'new@example.com' AND active = true;
    INSERT INTO checks SELECT COUNT(*) FROM "Developer" WHERE "userId" = 'existing' AND lower(email) = 'existing@example.com';
    INSERT INTO checks SELECT COUNT(*) FROM "Developer" WHERE "userId" = 'archived' AND name = 'archived@example.com' AND active = true;
    INSERT INTO checks SELECT COUNT(*) FROM "Developer" WHERE id = 'foreign-profile' AND "userId" = 'existing';
  `);
});

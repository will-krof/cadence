import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const migration = readFileSync(new URL("../prisma/migrations/20261112130000_single_superadmin/migration.sql", import.meta.url), "utf8");

function fixture(t) {
  const dir = mkdtempSync(path.join(tmpdir(), "cadence-superadmin-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const db = path.join(dir, "test.db");
  writeFileSync(db, "");
  const env = { ...process.env, DATABASE_URL: `file:${db}` };
  const execute = (input) => spawnSync(process.execPath,
    ["scripts/prisma.mjs", "db", "execute", "--stdin"],
    { env, input, encoding: "utf8" });
  const cli = (...args) => spawnSync(process.execPath,
    ["scripts/set-superadmin.mjs", ...args], { env, encoding: "utf8" });
  const ok = (result) => assert.equal(result.status, 0, result.stderr + result.stdout);
  ok(execute(`CREATE TABLE "User" ("email" TEXT UNIQUE NOT NULL, "role" TEXT NOT NULL DEFAULT 'ADMIN');
    INSERT INTO "User" ("email") VALUES ('owner@example.com'), ('other@example.com');`));
  return { execute, cli, ok };
}

test("database rejects another superadmin on both insert and update", (t) => {
  const { execute, ok } = fixture(t);
  ok(execute(migration));
  ok(execute(`UPDATE "User" SET "role" = 'SUPERADMIN' WHERE "email" = 'owner@example.com';`));
  for (const sql of [
    `UPDATE "User" SET "role" = 'SUPERADMIN' WHERE "email" = 'other@example.com';`,
    `INSERT INTO "User" VALUES ('third@example.com', 'SUPERADMIN');`,
  ]) {
    const result = execute(sql);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr + result.stdout, /UNIQUE constraint failed/);
  }
  // Unrelated accounts and repeated grants to the same holder remain valid.
  ok(execute(`INSERT INTO "User" VALUES ('ordinary@example.com', 'ADMIN');`));
  ok(execute(`UPDATE "User" SET "role" = 'SUPERADMIN' WHERE "email" = 'owner@example.com';`));
});

test("migration refuses existing duplicate holders", (t) => {
  const { execute, ok } = fixture(t);
  ok(execute(`UPDATE "User" SET "role" = 'SUPERADMIN';`));
  const result = execute(migration);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /UNIQUE constraint failed/);
});

test("operator command refuses missing accounts and a second holder", (t) => {
  const { execute, cli, ok } = fixture(t);
  ok(execute(migration));
  const missing = cli("missing@example.com");
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /Account not found/);
  ok(cli("owner@example.com"));
  ok(cli("owner@example.com"));
  const second = cli("other@example.com");
  assert.notEqual(second.status, 0);
  assert.match(second.stderr, /already the superadmin/);
  ok(cli("owner@example.com", "--revoke"));
  ok(cli("other@example.com"));
});

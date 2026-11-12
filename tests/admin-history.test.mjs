import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

test("registration history handles SQLite timestamp formats and survives deletion", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "cadence-admin-history-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const db = path.join(dir, "test.db");
  writeFileSync(db, "");
  const execute = (sql, success = true) => {
    const result = spawnSync(process.execPath, ["scripts/prisma.mjs", "db", "execute", "--stdin"], {
      env: { ...process.env, DATABASE_URL: `file:${db}` },
      input: "PRAGMA foreign_keys=ON;\n" + sql, encoding: "utf8",
    });
    if (success) assert.equal(result.status, 0, result.stdout + result.stderr);
    else assert.notEqual(result.status, 0);
  };
  execute(`CREATE TABLE "User" (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL,
    name TEXT, role TEXT DEFAULT 'ADMIN', "createdAt" DATETIME NOT NULL);
    INSERT INTO "User" VALUES
      ('actor', 'actor@example.com', 'Admin', 'SUPERADMIN', ${Date.UTC(2026, 10, 12, 23, 30)}),
      ('target', 'target@example.com', 'Target', 'ADMIN', '2026-11-12 00:00:00'),
      ('older', 'older@example.com', NULL, 'ADMIN', '2026-11-11T12:00:00.000Z');`);
  execute(readFileSync(new URL("../prisma/migrations/20261112150000_admin_console/migration.sql", import.meta.url), "utf8"));
  execute(`CREATE TEMP TABLE checks (ok INTEGER NOT NULL CHECK(ok=1));
    INSERT INTO checks SELECT count=2 FROM "RegistrationDay" WHERE day='2026-11-12';
    INSERT INTO checks SELECT count=1 FROM "RegistrationDay" WHERE day='2026-11-11';
    INSERT INTO "User" (id,email,"createdAt") VALUES ('new','new@example.com','2026-11-12T10:00:00.000Z');
    INSERT INTO checks SELECT count=3 FROM "RegistrationDay" WHERE day='2026-11-12';
    INSERT INTO "AdminAudit" (id,action,"actorId","targetId") VALUES ('audit','BAN','actor','target');
    DELETE FROM "User" WHERE id='target';
    INSERT INTO checks SELECT "targetId" IS NULL FROM "AdminAudit" WHERE id='audit';
    INSERT INTO checks SELECT count=3 FROM "RegistrationDay" WHERE day='2026-11-12';`);
  execute(`INSERT INTO "User" (id,email,"createdAt") VALUES ('new','duplicate@example.com','2026-11-12');`, false);
  execute(`CREATE TEMP TABLE checks (ok INTEGER NOT NULL CHECK(ok=1));
    INSERT INTO checks SELECT count=3 FROM "RegistrationDay" WHERE day='2026-11-12';`);
});

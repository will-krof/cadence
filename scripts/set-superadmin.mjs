#!/usr/bin/env node
/**
 * Grants or takes back the superadmin badge. Deliberately a command rather than
 * a screen: nothing in the app can hand this out, so no bug in the app can.
 *
 *   npm run make-superadmin -- you@example.com
 *   npm run make-superadmin -- you@example.com --revoke
 *
 * The badge buys install-wide counts and nothing else — no reach into anybody's
 * workspace, projects or people.
 */
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const revoke = args.includes("--revoke");
const email = (args.find((a) => !a.startsWith("--")) ?? "").trim().toLowerCase();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error(
    "Usage: npm run make-superadmin -- you@example.com [--revoke]"
  );
  process.exit(1);
}

const role = revoke ? "ADMIN" : "SUPERADMIN";
const quoted = `'${email.replace(/'/g, "''")}'`;

// Check existence and change the role in one transaction. The partial unique
// index is the authority for concurrent promotions: only one account can win.
// The temporary table's check works on both SQLite and PostgreSQL, including
// on a missing account (db execute otherwise succeeds after updating zero rows).
const sql = `BEGIN;
CREATE TEMP TABLE "cadence_role_target" (
  "matches" INTEGER NOT NULL CHECK ("matches" = 1)
);
INSERT INTO "cadence_role_target" SELECT COUNT(*) FROM "User" WHERE "email" = ${quoted};
UPDATE "User" SET "role" = '${role}' WHERE "email" = ${quoted};
DROP TABLE "cadence_role_target";
COMMIT;`;

try {
  const out = execFileSync(
    process.execPath,
    ["scripts/prisma.mjs", "db", "execute", "--stdin"],
    {
      input: sql,
      stdio: ["pipe", "pipe", "pipe"],
    }
  );
  void out;
  console.log(
    revoke
      ? `${email} is a plain admin again.`
      : `${email} is the installation's superadmin.`
  );
  // The role is read from the row on every request, so a session already open
  // picks this up on its next page load.
  console.log("Reload the app to see it.");
} catch (error) {
  const message = `${error.stdout ?? ""}${error.stderr ?? ""}`;
  if (/P2002|User_single_superadmin|UNIQUE constraint failed: User.role/i.test(message)) {
    console.error("Another account is already the superadmin. No role was changed.");
  } else if (/cadence_role_target|CHECK constraint failed/i.test(message)) {
    console.error("Account not found. No role was changed.");
  } else {
    console.error(message.trim() || error.message);
  }
  process.exit(1);
}

#!/usr/bin/env node
import "dotenv/config";
import { execFileSync } from "node:child_process";

if (!/^postgres(?:ql)?:/.test(process.env.DATABASE_URL ?? "")) {
  console.error("Vercel requires a PostgreSQL DATABASE_URL. Connect a database before deploying.");
  process.exit(1);
}

// DATABASE_URL is the pooled runtime connection. DIRECT_URL, when supplied,
// is used by Prisma's CLI for migrations rather than by the running app.
execFileSync(process.execPath, ["scripts/prisma.mjs", "generate"], { stdio: "inherit" });
execFileSync(process.execPath, ["scripts/prisma.mjs", "migrate", "deploy"], { stdio: "inherit" });
execFileSync("npm", ["run", "build"], { stdio: "inherit" });

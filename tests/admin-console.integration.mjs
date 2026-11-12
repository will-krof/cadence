import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { writeFileSync } from "node:fs";

// Refuse production or shared databases: this test creates and deletes accounts.
const database = new URL(process.env.TEST_DATABASE_URL || "postgresql://invalid");
if (!["localhost", "127.0.0.1"].includes(database.hostname) || !/^\/cadence_admin_test_[a-z0-9_]+$/.test(database.pathname)) {
  throw new Error("Provide a disposable local PostgreSQL TEST_DATABASE_URL named cadence_admin_test_<suffix>");
}
const env = { ...process.env, DATABASE_URL: database.href, DIRECT_URL: database.href,
  DATABASE_URL_UNPOOLED: database.href, POSTGRES_URL_NON_POOLING: database.href };
const migrated = spawnSync(process.execPath, ["scripts/prisma.mjs", "migrate", "deploy"], { env, encoding: "utf8" });
assert.equal(migrated.status, 0, migrated.stderr);
const listener = createServer();
await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve));
const port = listener.address().port;
await new Promise((resolve) => listener.close(resolve));
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { env, stdio: "ignore" });

class Client {
  cookie = "";
  async call(path, data, method = data ? "POST" : "GET") {
    const response = await fetch(base + path, { method, redirect: "manual", headers: {
      "Content-Type": "application/json", Cookie: this.cookie, Origin: base,
    }, body: data === undefined ? undefined : JSON.stringify(data) });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) this.cookie = cookies.map((cookie) => cookie.split(";")[0]).join("; ");
    return { status: response.status, body: await response.json().catch(() => null) };
  }
  async ok(path, data, method) {
    const result = await this.call(path, data, method);
    assert.ok(result.status >= 200 && result.status < 300, `${path}: ${result.status} ${JSON.stringify(result.body)}`);
    return result.body;
  }
}
const password = "Disposable-test-password-38924";
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(base)).ok) break; } catch {}
    await delay(100);
  }
  const admin = new Client(), target = new Client(), ordinary = new Client(), anonymous = new Client(), member = new Client();
  const adminAccount = await admin.ok("/api/auth/signup", { name: "Test Operator", email: "operator@example.invalid", password });
  const account = await target.ok("/api/auth/signup", { name: "Moderation Alice", email: "alice@example.invalid", password });
  await ordinary.ok("/api/auth/signup", { name: "Ordinary Owner", email: "ordinary@example.invalid", password });
  const grant = spawnSync(process.execPath, ["scripts/set-superadmin.mjs", "operator@example.invalid"], { env, encoding: "utf8" });
  assert.equal(grant.status, 0, grant.stderr);

  for (const path of ["/api/admin/users", "/api/admin/registrations", "/api/admin/audit"]) {
    assert.equal((await anonymous.call(path)).status, 401);
    assert.equal((await ordinary.call(path)).status, 404);
  }
  assert.equal((await ordinary.call(`/api/admin/users/${account.id}`, { action: "BAN" }, "PATCH")).status, 404);
  assert.equal((await ordinary.call(`/api/admin/users/${account.id}`, { confirmation: account.email }, "DELETE")).status, 404);
  assert.equal((await admin.call(`/api/admin/users/${adminAccount.id}`, { action: "BAN" }, "PATCH")).status, 409);
  assert.equal((await admin.call(`/api/admin/users/${adminAccount.id}`, { confirmation: "operator@example.invalid" }, "DELETE")).status, 409);
  assert.equal((await admin.call(`/api/admin/users/${account.id}`, { action: "PROMOTE" }, "PATCH")).status, 400);
  assert.equal((await admin.call(`/api/admin/users/${account.id}`, null, "PATCH")).status, 400);
  assert.equal((await admin.call(`/api/admin/users/${account.id}`, { action: "BAN", reason: "x".repeat(501) }, "PATCH")).status, 400);

  const users = await admin.ok("/api/admin/users");
  assert.equal(users.total, 3);
  assert.equal(users.users.some((user) => "passwordHash" in user || "projects" in user), false);
  assert.equal((await admin.ok("/api/admin/users?q=MODERATION")).total, 1);
  const before = await admin.ok("/api/admin/registrations?days=7");
  assert.equal(before.points.length, 7);
  assert.equal(before.points.reduce((sum, point) => sum + point.count, 0), 3);
  assert.equal((await admin.call("/api/admin/registrations?days=999")).status, 400);

  const project = await target.ok("/api/projects", { name: "Private target project", hasTracker: true, hasRoles: true });
  await target.ok("/api/tasks", { projectId: project.id, title: "Private target task" });
  await target.ok("/api/notes", { content: "Private target note" });
  const person = await target.ok("/api/developers", { name: "Invited tester" });
  const invite = await target.ok(`/api/projects/${project.id}/members`, { developerId: person.id, roleIds: [project.roles.find((role) => role.isAdmin).id] }, "PUT");
  await member.ok(`/api/invites/${invite.invite.token}`, { username: "invited_tester", password });
  assert.equal((await admin.ok("/api/admin/users")).total, 3, "Invite logins must not appear in signup accounts");
  assert.equal((await admin.ok("/api/projects")).length, 0);
  assert.equal((await admin.ok(`/api/tasks?projectId=${project.id}`)).length, 0);
  assert.equal((await admin.call(`/api/projects/${project.id}`, { name: "Not allowed" }, "PATCH")).status, 404);

  await admin.ok(`/api/admin/users/${account.id}`, { action: "BAN", reason: "Integration test" }, "PATCH");
  assert.equal((await admin.ok("/api/admin/users?status=banned")).total, 1);
  assert.equal((await target.call("/api/projects")).status, 401);
  assert.equal((await member.call("/api/projects")).status, 401);
  const blocked = new Client(), blockedMember = new Client();
  assert.equal((await blocked.call("/api/auth/login", { email: account.email, password })).status, 403);
  assert.equal((await blockedMember.call("/api/auth/login", { login: "invited_tester", password })).status, 403);
  assert.equal((await blocked.call(`/api/invites/${invite.invite.token}`, { username: "blocked_login", password })).status, 404);
  await admin.ok(`/api/admin/users/${account.id}`, { action: "UNBAN" }, "PATCH");
  assert.equal((await target.call("/api/projects")).status, 401, "Unban must not restore old sessions");
  await target.ok("/api/auth/login", { email: account.email, password });
  await member.ok("/api/auth/login", { login: "invited_tester", password });
  await admin.ok(`/api/admin/users/${account.id}`, { action: "REVOKE_SESSIONS" }, "PATCH");
  assert.equal((await target.call("/api/projects")).status, 401);
  assert.equal((await member.call("/api/projects")).status, 401);
  await target.ok("/api/auth/login", { email: account.email, password });
  assert.equal((await admin.call(`/api/admin/users/${account.id}`, { confirmation: "wrong@example.invalid" }, "DELETE")).status, 400);
  await admin.ok(`/api/admin/users/${account.id}`, { confirmation: account.email }, "DELETE");
  assert.equal((await target.call("/api/projects")).status, 401);
  assert.equal((await admin.ok("/api/admin/users")).total, 2);
  assert.equal((await admin.ok("/api/admin/registrations?days=7")).points.reduce((sum, point) => sum + point.count, 0), 3, "Deletion must preserve registration history");
  const audit = await admin.ok("/api/admin/audit");
  assert.deepEqual(new Set(audit.events.map((event) => event.action)), new Set(["BAN", "UNBAN", "REVOKE_SESSIONS", "DELETE"]));
  assert.equal(audit.events.every((event) => event.target === null), true, "Deleted identity must not remain in audit joins");
  console.log("Admin API integration passed: authorization, private workspace isolation, search, counts, ban/unban, owner/member sessions, protected superadmin, confirmed deletion and retained history.");
  if (process.env.ADMIN_TEST_FIXTURE) {
    writeFileSync(process.env.ADMIN_TEST_FIXTURE, JSON.stringify({ database: database.href, email: "operator@example.invalid", password, userId: adminAccount.id }), { mode: 0o600 });
  }
} finally { server.kill("SIGTERM"); }

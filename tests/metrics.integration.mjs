import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { writeFileSync } from "node:fs";

// Refuse production or shared databases: this test creates fake projects and metrics fixtures.
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
const password = "Metrics-test-password-38726";
try {
  for (let i=0; i<100; i++) { try { if ((await fetch(base)).ok) break; } catch {} await delay(100); }
  const owner = new Client(), stranger = new Client(), member = new Client(), observer = new Client(), anonymous = new Client();
  await owner.ok("/api/auth/signup", { name: "Metrics Owner", email: "metrics-owner@example.invalid", password });
  await stranger.ok("/api/auth/signup", { name: "Other Workspace", email: "metrics-stranger@example.invalid", password });
  const grant = spawnSync(process.execPath, ["scripts/set-superadmin.mjs", "metrics-stranger@example.invalid"], { env, encoding: "utf8" });
  assert.equal(grant.status, 0, grant.stderr);
  const project = await owner.ok("/api/projects", { name: "Metrics QA", hasTracker: true, hasRoles: true });
  assert.equal(project.projectType, "PROJECT"); assert.equal(project.hasMetrics, false); assert.equal(project.metricsProgress, true);
  const path = `/api/projects/${project.id}`;
  assert.equal((await anonymous.call(path+"/metrics")).status, 401);
  assert.equal((await owner.call(path+"/metrics")).status, 404);
  await owner.ok(path, { hasMetrics: true }, "PATCH");
  const empty = await owner.ok(path+"/metrics"); assert.equal(empty.enabled.length, 5); assert.equal(empty.values.progress.percent, 0); assert.equal(empty.values.completionTime.days, null); assert.equal(empty.hasDoneColumn, false);
  assert.equal((await stranger.call(path+"/metrics")).status, 404, "Superadmin cannot read another workspace's metrics");
  const todo = await owner.ok(path+"/columns", { name: "To do" });
  const done = await owner.ok(path+"/columns", { name: "Done", isDone: true });
  const roster = await owner.ok("/api/developers"); const teammate = await owner.ok("/api/developers", { name: "Metrics Teammate", email: "teammate@example.invalid" });
  const task = await owner.ok("/api/tasks", { projectId: project.id, title: "Overdue work", columnId: todo.id, endDate: "2000-01-01", assigneeIds: [roster[0].id] });
  await owner.ok("/api/tasks", { projectId: project.id, title: "Due today", columnId: todo.id, endDate: new Date().toISOString().slice(0,10), assigneeIds: [roster[0].id, teammate.id] });
  await owner.ok("/api/tasks", { projectId: project.id, title: "Completed work", columnId: done.id });
  const reopened = await owner.ok("/api/tasks", { projectId: project.id, title: "Reopened", columnId: done.id });
  await owner.ok(`/api/tasks/${reopened.id}`, { columnId: todo.id }, "PATCH");
  await owner.ok("/api/tasks", { projectId: project.id, title: "Subtask", parentId: task.id, columnId: todo.id });
  const metrics = await owner.ok(path+"/metrics");
  assert.deepEqual(metrics.values.progress, { percent: 20, done: 1, total: 5 });
  assert.deepEqual(metrics.values.overdue, { count: 1, datedOpen: 2 });
  assert.equal(metrics.values.completed.count, 1); assert.equal(metrics.values.completionTime.sample, 1); assert(metrics.values.completionTime.days >= 0);
  assert.equal(metrics.values.workload.totalOpen, 4); assert.equal(metrics.values.workload.unassigned, 2);
  assert.equal(metrics.values.workload.people[0].name, "Metrics Owner"); assert.equal(metrics.values.workload.people[0].openTasks, 2);
  assert.equal("email" in metrics.values.workload.people[0], false);
  assert.equal(JSON.stringify(metrics).includes("Overdue work"), false);
  await owner.ok(path, { metricsOverdue: false, metricsCompletionTime: false }, "PATCH");
  const selected = await owner.ok(path+"/metrics"); assert.equal(selected.enabled.length, 3); assert.equal("overdue" in selected.values, false); assert.equal("completionTime" in selected.values, false);
  await owner.ok(path, { hasMetrics: false }, "PATCH"); assert.equal((await owner.call(path+"/metrics")).status, 404);
  await owner.ok(path, { hasMetrics: true }, "PATCH"); assert.deepEqual((await owner.ok(path+"/metrics")).values.progress, metrics.values.progress);
  await owner.ok(path, { projectType: "PRODUCT" }, "PATCH"); const product = await owner.ok(path+"/metrics"); assert.equal(product.projectType, "PRODUCT"); assert.deepEqual(product.values, {});
  await owner.ok(path, { projectType: "PROJECT" }, "PATCH"); assert.equal((await owner.ok(path+"/metrics")).enabled.length, 3);
  assert.equal((await owner.call(path, { projectType: "UNKNOWN" }, "PATCH")).status, 400);
  assert.equal((await owner.call("/api/projects", { name: "Invalid type", projectType: "UNKNOWN" })).status, 400);
  const otherProject = await owner.ok("/api/projects", { name: "Other project", hasMetrics: true, hasTracker: true });
  const invite = await owner.ok(path+"/members", { developerId: teammate.id, roleIds: [project.roles.find(r=>!r.isAdmin).id] }, "PUT");
  await member.ok(`/api/invites/${invite.invite.token}`, { username: "metrics_member", password });
  assert.equal((await member.call(path+"/metrics")).status, 200);
  assert.equal((await member.call(`/api/projects/${otherProject.id}/metrics`)).status, 404, "Requested project must not be overwritten by the membership filter");
  assert.equal((await member.call(path, { hasMetrics: false }, "PATCH")).status, 401);
  const viewRole = await owner.ok(path+"/roles", { name: "Observer", canViewWiki: true });
  const observerPerson = await owner.ok("/api/developers", { name: "Metrics Observer" });
  const observerInvite = await owner.ok(path+"/members", { developerId: observerPerson.id, roleIds: [viewRole.id] }, "PUT");
  await observer.ok(`/api/invites/${observerInvite.invite.token}`, { username: "metrics_observer", password });
  assert.equal((await observer.call(path+"/metrics")).status, 403);
  await owner.ok(path+`/roles/${viewRole.id}`, { canViewTracker: true }, "PATCH"); assert.equal((await observer.call(path+"/metrics")).status, 200);
  await owner.ok(path, { hasTracker: false }, "PATCH"); assert.equal((await member.call(path+"/metrics")).status, 403); assert.equal((await owner.call(path+"/metrics")).status, 200);
  await owner.ok(path, { hasTracker: true, metricsOverdue: true, metricsCompletionTime: true }, "PATCH");
  await owner.ok(`/api/projects/${otherProject.id}`, { metricsProgress: false, metricsOverdue: false, metricsCompleted: false, metricsCompletionTime: false, metricsWorkload: false }, "PATCH");
  assert.deepEqual((await owner.ok(`/api/projects/${otherProject.id}/metrics`)).values, {});
  console.log("Metrics API passed: defaults, five indicators, reopened tasks/subtasks, filters, disable/re-enable data retention, Project/Product mode, invalid types, owner/member permissions and cross-workspace/project isolation.");
  if(process.env.METRICS_TEST_FIXTURE)writeFileSync(process.env.METRICS_TEST_FIXTURE, JSON.stringify({ database:database.href,email:"metrics-owner@example.invalid",password,projectId:project.id,otherProjectId:otherProject.id,developerId:roster[0].id }),{mode:0o600});
} finally { server.kill("SIGTERM"); }

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/metrics.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { buildProjectMetrics } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const now = new Date("2026-11-14T12:00:00Z");
const person = (id, name) => ({ developer: { id, name, color: "#60a5fa" } });
function task(id, done, created = "2026-11-10", due = null, assignees = []) {
  return { id, column: done ? { isDone: true } : null, createdAt: new Date(created), endDate: due ? new Date(due) : null, assignees };
}

test("project metrics handle reopened work, missing history, UTC due dates and shared assignments", () => {
  const ada = person("a", "Ada"), bob = person("b", "Bob");
  const tasks = [task("done", true), task("old", true, "2026-11-01"), task("late", false, undefined, "2026-11-13", [ada, ada, bob]),
    task("today", false, undefined, "2026-11-14", [bob]), task("undated", false), task("reopened", false, undefined, null, [ada]), task("no-history", true)];
  const result = buildProjectMetrics(tasks, [
    { taskId: "done", at: new Date("2026-11-12") }, { taskId: "done", at: new Date("2026-11-13") },
    { taskId: "old", at: new Date("2026-11-06") }, { taskId: "reopened", at: new Date("2026-11-12") },
  ], now);
  assert.deepEqual(result.progress, { percent: 43, done: 3, total: 7 });
  assert.deepEqual(result.overdue, { count: 1, datedOpen: 2 });
  assert.equal(result.completed.count, 1);
  assert.equal(result.completed.from, "2026-11-08T00:00:00.000Z");
  assert.deepEqual(result.completionTime, { days: 4, sample: 2, untracked: 1 });
  assert.equal(result.workload.unassigned, 1);
  assert.equal(result.workload.totalOpen, 4);
  assert.deepEqual(result.workload.people.map(p => [p.name, p.openTasks]), [["Ada", 2], ["Bob", 2]]);
});

test("completion history is bounded by creation time, the reporting date and the seven-day boundary", () => {
  const tasks = [task("boundary", true, "2026-11-01"), task("before", true, "2026-11-01"), task("future", true), task("invalid", true)];
  const result = buildProjectMetrics(tasks, [
    { taskId: "boundary", at: new Date("2026-11-08T00:00:00Z") },
    { taskId: "before", at: new Date("2026-11-07T23:59:59Z") },
    { taskId: "future", at: new Date("2026-11-15") },
    { taskId: "invalid", at: new Date("2026-11-09") },
  ], now);
  assert.equal(result.completed.count, 1);
  assert.equal(result.completionTime.sample, 2);
  assert.equal(result.completionTime.untracked, 2);
});

test("empty projects have zero counts and no invented completion duration", () => {
  const result = buildProjectMetrics([], [], now);
  assert.deepEqual(result.progress, { percent: 0, done: 0, total: 0 });
  assert.equal(result.completed.count, 0);
  assert.equal(result.completionTime.days, null);
  assert.deepEqual(result.workload, { totalOpen: 0, unassigned: 0, people: [] });
});

"use client";

import { useEffect, useState } from "react";
import type { Project } from "@/lib/types";
import type { MetricsPayload } from "@/lib/metrics-types";
import { Panel, StatTile } from "@/components/reports/charts";

function duration(days: number | null) {
  if (days == null) return "—";
  if (days < 1 / 1440) return "< 1 min";
  const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
  if (days < 1 / 24) return `${number.format(days * 1440)} min`;
  if (days < 1) return `${number.format(days * 24)} hours`;
  return `${number.format(days)} days`;
}

export function MetricsView({ project }: { project: Project }) {
  const [data, setData] = useState<MetricsPayload | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/projects/${encodeURIComponent(project.id)}/metrics`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Could not load project metrics. Please try again.");
        const result: MetricsPayload = await response.json();
        if (!controller.signal.aborted) {
          setError("");
          setData(result);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setData(null);
          setError(error.message);
        }
      });
    return () => controller.abort();
  }, [
    project.id,
    project.projectType,
    project.hasMetrics,
    project.metricsProgress,
    project.metricsOverdue,
    project.metricsCompleted,
    project.metricsCompletionTime,
    project.metricsWorkload,
    reload,
  ]);

  const values = data?.values;
  const workloadPeak =
    values?.workload?.people.reduce(
      (peak, person) => Math.max(peak, person.openTasks),
      1,
    ) ?? 1;
  return (
    <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="t-title">Metrics</h2>
            <p className="t-small mt-1">
              {project.projectType === "PRODUCT"
                ? "Product indicators"
                : "Key project indicators, calculated from this project's tasks."}
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setError("");
              setData(null);
              setReload((value) => value + 1);
            }}
          >
            Refresh metrics
          </button>
        </header>
        {error ? (
          <p role="alert" className="t-small text-[var(--danger)]">
            {error}
          </p>
        ) : !data ? (
          <p role="status" className="t-small">
            Loading metrics…
          </p>
        ) : data.projectType === "PRODUCT" ? (
          <Panel
            title="Product metrics are coming next"
            hint="Manual entry for a selected period is planned."
          >
            <p className="t-small">
              Project indicators are not shown for a product. Choose Project in
              settings to use task metrics.
            </p>
          </Panel>
        ) : !data.enabled.length ? (
          <Panel title="No metrics selected">
            <p className="t-small">
              Open Project settings → Metrics and enable the indicators you want
              to see.
            </p>
          </Panel>
        ) : (
          <>
            {!data.hasDoneColumn && (
              <p className="card p-3 text-[0.75rem] text-[var(--ink-secondary)]">
                No tracker column is marked as finished. Progress and completion
                indicators need a column with “Work here is finished” enabled in
                the tracker.
              </p>
            )}
            <div
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              aria-label="Project metrics"
            >
              {values?.progress && (
                <StatTile
                  label="Project progress"
                  value={`${values.progress.percent}%`}
                  hint={`${values.progress.done} of ${values.progress.total} tasks completed`}
                />
              )}
              {values?.overdue && (
                <StatTile
                  label="Overdue tasks"
                  value={String(values.overdue.count)}
                  hint={`${values.overdue.datedOpen} open tasks have a due date; undated tasks are excluded`}
                  tone="alert"
                />
              )}
              {values?.completed && (
                <StatTile
                  label="Completed in 7 days"
                  value={String(values.completed.count)}
                  hint="Currently completed tasks; latest completion within 7 calendar days, including today (UTC)"
                />
              )}
              {values?.completionTime && (
                <StatTile
                  label="Average completion time"
                  value={duration(values.completionTime.days)}
                  hint={`${values.completionTime.sample} completed tasks with recorded history; creation to latest completion. ${values.completionTime.untracked} without usable history.`}
                />
              )}
              {values?.workload && (
                <StatTile
                  label="Team workload"
                  value={`${values.workload.totalOpen} open`}
                  hint={`${values.workload.unassigned} unassigned tasks`}
                />
              )}
            </div>
            {values?.progress && (
              <Panel title="Completion">
                <div
                  className="h-2 overflow-hidden rounded-full bg-[var(--gridline)]"
                  role="progressbar"
                  aria-label="Task completion"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={values.progress.percent}
                >
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{ width: `${values.progress.percent}%` }}
                  />
                </div>
              </Panel>
            )}
            {values?.workload && (
              <Panel
                title="Open assignments"
                hint="Shared tasks count once for each assignee. Only open work is shown."
              >
                {values.workload.people.length ? (
                  <div className="max-h-80 overflow-y-auto">
                    <ul className="space-y-3">
                      {values.workload.people.map((person) => (
                        <li key={person.id}>
                          <div className="mb-1 flex min-w-0 items-center justify-between gap-3 text-[0.75rem]">
                            <span
                              className="min-w-0 truncate"
                              title={person.name}
                            >
                              {person.name}
                            </span>
                            <span className="shrink-0 tabular-nums text-[var(--ink-secondary)]">
                              {person.openTasks} open
                            </span>
                          </div>
                          <div
                            aria-hidden="true"
                            className="h-1.5 overflow-hidden rounded-full bg-[var(--gridline)]"
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                background: person.color,
                                width: `${(person.openTasks / workloadPeak) * 100}%`,
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="t-small">No open tasks are assigned yet.</p>
                )}
              </Panel>
            )}
            <p className="t-micro">
              All tasks and subtasks are counted. Due dates use calendar days in
              UTC. Missing completion history is excluded from timing metrics.
              Updated {new Date(data.generatedAt).toLocaleString()}.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

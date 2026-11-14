"use client";

import type { BurndownData } from "@/lib/metrics-types";
import { Panel } from "@/components/reports/charts";

export function BurndownChart({ data }: { data: BurndownData }) {
  const { points } = data;
  const width = 720,
    height = 260,
    left = 42,
    right = 16,
    top = 18,
    bottom = 34;
  const max = Math.max(
    1,
    ...points.flatMap((p) => [p.remaining ?? 0, p.ideal ?? 0, p.scope]),
  );
  const start = +new Date(points[0].date),
    end = +new Date(points.at(-1)!.date);
  const x = (date: string) =>
    left +
    ((+new Date(date) - start) / (end - start || 1)) * (width - left - right);
  const y = (value: number) =>
    top + (1 - value / max) * (height - top - bottom);
  function path(key: "remaining" | "ideal") {
    let connected = false;
    return points
      .map((p) => {
        const value = p[key];
        if (value === null) {
          connected = false;
          return "";
        }
        const command = connected ? "L" : "M";
        connected = true;
        return `${command}${x(p.date)},${y(value)}`;
      })
      .join(" ");
  }
  const hasIdeal = points.some((p) => p.ideal !== null);
  return (
    <Panel
      title="Burndown chart"
      hint="Remaining tasks by day (UTC). Today shows the current count; future actuals are left blank."
    >
      {!data.totalTasks ? (
        <p className="t-small">
          No tasks yet. Create tasks to start tracking the burndown.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 text-xs text-[var(--ink-secondary)]">
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-0.5 w-5 bg-[var(--accent)]"
              />
              Actual remaining
            </span>
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="w-5 border-t-2 border-dashed border-[var(--ink-secondary)]"
              />
              Ideal remaining
            </span>
          </div>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="mt-3 w-full"
            role="img"
            aria-label="Burndown chart: actual and ideal remaining tasks. Daily values are available in the table below."
          >
            {[0, 0.5, 1].map((fraction) => (
              <g key={fraction}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={y(max * fraction)}
                  y2={y(max * fraction)}
                  stroke="var(--hairline)"
                />
                <text
                  x={left - 8}
                  y={y(max * fraction) + 4}
                  textAnchor="end"
                  fill="var(--ink-muted)"
                  fontSize={12}
                >
                  {Number((max * fraction).toFixed(1))}
                </text>
              </g>
            ))}
            <path
              d={path("ideal")}
              fill="none"
              stroke="var(--ink-secondary)"
              strokeWidth={2}
              strokeDasharray="6 5"
            />
            <path
              d={path("remaining")}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={2.5}
            />
            {points
              .filter((p) => p.remaining !== null)
              .map((p) => (
                <circle
                  key={p.date}
                  cx={x(p.date)}
                  cy={y(p.remaining!)}
                  r={3}
                  fill="var(--accent)"
                >
                  <title>
                    {p.date}: {p.remaining} remaining; {p.scope} tasks in scope
                  </title>
                </circle>
              ))}
            <text x={left} y={height - 8} fill="var(--ink-muted)" fontSize={12}>
              {points[0].date}
            </text>
            {points.length > 1 && (
              <text
                x={width - right}
                y={height - 8}
                textAnchor="end"
                fill="var(--ink-muted)"
                fontSize={12}
              >
                {points.at(-1)!.date}
              </text>
            )}
          </svg>
          {!data.deadline && (
            <p className="t-small">
              Set the project end date in Project settings to show the ideal
              line.
            </p>
          )}
          {data.deadline && !hasIdeal && (
            <p className="t-small">
              The ideal line needs a known starting count and a deadline on or
              after the start date.
            </p>
          )}
          {data.missingHistory > 0 && (
            <p className="t-small">
              History is incomplete for {data.missingHistory} tasks. Unknown
              historical counts appear as gaps.
            </p>
          )}
          <p className="t-micro mt-2">
            All current tasks and subtasks count equally. New tasks and reopened
            work increase the remaining count. The ideal line uses the first
            day’s remaining count and the project deadline. Deleted tasks are
            excluded; history uses the current “finished” column settings. Long
            periods are sampled.
          </p>
          <details className="mt-3 text-xs">
            <summary className="cursor-pointer">View daily values</summary>
            <div className="mt-2 max-h-64 overflow-auto">
              <table className="w-full text-left tabular-nums">
                <caption className="sr-only">
                  Burndown values in task counts, UTC
                </caption>
                <thead>
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Actual</th>
                    <th className="p-2">Ideal</th>
                    <th className="p-2">Scope to date</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => (
                    <tr
                      key={p.date}
                      className="border-t border-[var(--hairline)]"
                    >
                      <td className="p-2">{p.date}</td>
                      <td className="p-2">{p.remaining ?? "—"}</td>
                      <td className="p-2">
                        {p.ideal === null ? "—" : Number(p.ideal.toFixed(1))}
                      </td>
                      <td className="p-2">{p.scope}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </Panel>
  );
}

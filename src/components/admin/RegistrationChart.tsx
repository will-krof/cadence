"use client";

import { useState } from "react";
import type { RegistrationSeries } from "@/lib/admin-types";

function dayLabel(day: string) {
  return new Date(day + "T00:00:00Z").toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function RegistrationChart({ data }: { data: RegistrationSeries }) {
  const [table, setTable] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const points = data.points;
  const total = points.reduce((sum, point) => sum + point.count, 0);
  const max = Math.max(1, ...points.map((point) => point.count));
  const width = 900,
    height = 230,
    left = 42,
    right = 12,
    top = 16,
    bottom = 38;
  const plotWidth = width - left - right,
    plotHeight = height - top - bottom;
  const baseline = height - bottom,
    step = plotWidth / points.length;
  const active =
    points.find((point) => point.day === selected) ?? points[points.length - 1];
  const ticks = max > 1 ? [0, Math.floor(max / 2), max] : [0, 1];
  return (
    <div>
      <p className="text-[0.8125rem] text-[var(--ink-secondary)]">
        {total.toLocaleString()} registration{total === 1 ? "" : "s"} in this
        period · daily totals in UTC
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`Registrations per day, ${total} in the selected period. Use the data table for individual dates.`}
      >
        {ticks.map((value) => {
          const y = baseline - (value / max) * plotHeight;
          return (
            <g key={value}>
              <line
                x1={left}
                x2={width - right}
                y1={y}
                y2={y}
                stroke="var(--gridline)"
              />
              <text
                x={left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--ink-muted)"
              >
                {value}
              </text>
            </g>
          );
        })}
        {points.map((point, i) => {
          const barHeight = (point.count / max) * plotHeight;
          return (
            <g
              key={point.day}
              onMouseEnter={() => setSelected(point.day)}
              onClick={() => setSelected(point.day)}
            >
              <rect
                x={left + i * step}
                y={top}
                width={step}
                height={plotHeight}
                fill="transparent"
              />
              <rect
                x={left + i * step + step * 0.14}
                y={baseline - Math.max(1, barHeight)}
                width={Math.max(1, step * 0.72)}
                height={Math.max(1, barHeight)}
                rx="1"
                fill={point.count ? "var(--accent)" : "var(--baseline)"}
              >
                <title>
                  {dayLabel(point.day)}: {point.count} registrations
                </title>
              </rect>
            </g>
          );
        })}
        {[0, Math.floor((points.length - 1) / 2), points.length - 1].map(
          (i) => (
            <text
              key={i}
              x={left + (i + 0.5) * step}
              y={height - 10}
              textAnchor={
                i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"
              }
              fontSize="11"
              fill="var(--ink-muted)"
            >
              {dayLabel(points[i].day)}
            </text>
          ),
        )}
      </svg>
      {active && (
        <p
          className="text-[0.75rem] text-[var(--ink-secondary)]"
          aria-live="polite"
        >
          {dayLabel(active.day)}: <strong>{active.count}</strong> registration
          {active.count === 1 ? "" : "s"}
        </p>
      )}
      <button
        type="button"
        className="mt-3 text-[0.75rem] text-[var(--accent)] hover:underline"
        aria-expanded={table}
        onClick={() => setTable(!table)}
      >
        {table ? "Hide data table" : "Show data table"}
      </button>
      {table && (
        <div className="thin-scroll mt-3 max-h-72 overflow-y-auto">
          <table className="w-full text-left text-[0.75rem]">
            <caption className="sr-only">Registrations by UTC date</caption>
            <thead>
              <tr>
                <th className="py-2">Date (UTC)</th>
                <th className="py-2 text-right">Registrations</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr
                  key={point.day}
                  className="border-t border-[var(--hairline)]"
                >
                  <td className="py-2">{dayLabel(point.day)}</td>
                  <td className="py-2 text-right tabular-nums">
                    {point.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[0.6875rem] text-[var(--ink-muted)]">
        Daily registration totals are retained after account deletion, without
        retaining the deleted account’s identity.
      </p>
    </div>
  );
}

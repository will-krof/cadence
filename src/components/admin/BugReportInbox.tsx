"use client";

import { useEffect, useState } from "react";
import { Field } from "@/components/ui";
import { useFeedback } from "@/components/Feedback";
import {
  BUG_REPORT_LABELS,
  BUG_REPORT_STATUSES,
  type BugTicket,
  type BugTicketPage,
  type BugReportStatus,
} from "@/lib/bug-report-types";

export function BugReportInbox() {
  const { notify } = useFeedback();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<BugTicketPage | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      async () => {
        setLoading(true);
        setError("");
        try {
          const response = await fetch(
            `/api/admin/bug-reports?${new URLSearchParams({ q: query, status, page: String(page) })}`,
            { signal: controller.signal, cache: "no-store" },
          );
          if (!response.ok)
            throw new Error("Could not load bug reports. Try again.");
          const result: BugTicketPage = await response.json();
          if (controller.signal.aborted) return;
          setData(result);
          if (!result.tickets.length && page > 1) setPage(page - 1);
        } catch (error) {
          if (!controller.signal.aborted) {
            setData(null);
            setError((error as Error).message);
          }
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      },
      query ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, status, page, reload]);

  async function update(ticket: BugTicket, status: BugReportStatus) {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/admin/bug-reports/${encodeURIComponent(ticket.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      if (!response.ok)
        throw new Error("Could not update this ticket. Try again.");
      notify(
        "success",
        `Ticket marked ${BUG_REPORT_LABELS[status].toLowerCase()}.`,
      );
      setReload((value) => value + 1);
    } catch (error) {
      notify("error", (error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="card p-4 sm:p-6"
      aria-label="Bug reports"
      aria-busy={loading}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="t-heading">
          Bug reports{data ? ` (${data.total})` : ""}
        </h2>
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={() => setReload((value) => value + 1)}
        >
          Refresh tickets
        </button>
      </div>
      <p className="t-small mb-4">
        Text-only reports from workspace owners and invited members, with their
        sender details.
      </p>
      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Field label="Search bug reports">
          <input
            type="search"
            className="input"
            placeholder="Subject, description or sender"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Field label="Ticket status">
          <select
            aria-label="Ticket status"
            className="select"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">All statuses</option>
            {BUG_REPORT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {BUG_REPORT_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {error && (
        <p role="alert" className="t-small text-[var(--danger)]">
          {error}
        </p>
      )}
      {loading && (
        <p role="status" className="t-small mb-3">
          Loading bug reports…
        </p>
      )}
      {!loading && !error && !data?.tickets.length && (
        <p className="t-small py-4">No bug reports match these filters.</p>
      )}
      <ol className="space-y-3">
        {data?.tickets.map((ticket) => (
          <li
            key={ticket.id}
            className="rounded-[var(--radius)] border border-[var(--hairline)] p-4"
          >
            <article aria-label={`Bug report: ${ticket.subject}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p
                    className="text-[0.6875rem] text-[var(--ink-muted)]"
                    title={ticket.id}
                  >
                    #{ticket.id.slice(-8).toUpperCase()} ·{" "}
                    <time dateTime={ticket.createdAt}>
                      {new Date(ticket.createdAt).toLocaleString()}
                    </time>
                  </p>
                  <h3 className="mt-1 break-words text-[0.875rem] font-semibold">
                    {ticket.subject}
                  </h3>
                </div>
                <select
                  aria-label={`Status for ${ticket.subject}`}
                  className={`select !w-auto ${ticket.status === "RESOLVED" ? "status-live" : ticket.status === "IN_PROGRESS" ? "status-dev" : "status-stage"}`}
                  value={ticket.status}
                  disabled={busy || loading}
                  onChange={(event) =>
                    update(ticket, event.target.value as BugReportStatus)
                  }
                >
                  {BUG_REPORT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {BUG_REPORT_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[0.75rem]">
                <span className="font-medium break-words">
                  {ticket.reporterName}
                </span>
                <span className="chip">
                  {ticket.reporterKind === "MEMBER"
                    ? "Invited member"
                    : "Workspace owner"}
                </span>
                {ticket.reporterEmail && (
                  <span className="break-all text-[var(--ink-secondary)]">
                    {ticket.reporterEmail}
                  </span>
                )}
                {ticket.reporterUsername && (
                  <span className="break-all text-[var(--ink-secondary)]">
                    @{ticket.reporterUsername}
                  </span>
                )}
              </div>
              <p className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap break-words text-[0.8125rem] leading-relaxed text-[var(--ink-secondary)]">
                {ticket.message}
              </p>
            </article>
          </li>
        ))}
      </ol>
      {data && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--hairline)] pt-4 text-[0.75rem]">
          <span>
            Page {page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={loading || page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous tickets
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={loading || page * data.pageSize >= data.total}
              onClick={() => setPage(page + 1)}
            >
              Next tickets
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

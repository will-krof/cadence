"use client";

import { useEffect, useState } from "react";
import { useFeedback } from "@/components/Feedback";
import { Field, Modal } from "@/components/ui";
import { BugReportInbox } from "@/components/admin/BugReportInbox";
import { RegistrationChart } from "@/components/admin/RegistrationChart";
import type {
  AdminAction,
  ManagedUser,
  UserPage,
  RegistrationSeries,
  AuditEntry,
} from "@/lib/admin-types";

const ACTION_NAMES: Record<AdminAction, string> = {
  BAN: "Ban account",
  UNBAN: "Restore access",
  REVOKE_SESSIONS: "Sign out everywhere",
};
const AUDIT_NAMES: Record<string, string> = {
  BAN: "Banned",
  UNBAN: "Access restored",
  REVOKE_SESSIONS: "Sessions revoked",
  DELETE: "Deleted",
};
const timestamp = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

async function read<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? "Your session has ended. Sign in again."
        : "Could not load this information. Try again.",
    );
  return response.json();
}

export function AdminPanel({ currentUserId }: { currentUserId: string }) {
  const { notify } = useFeedback();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [order, setOrder] = useState("newest");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UserPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [days, setDays] = useState(30);
  const [registrations, setRegistrations] = useState<RegistrationSeries | null>(
    null,
  );
  const [chartError, setChartError] = useState("");
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditError, setAuditError] = useState("");
  const [selected, setSelected] = useState<{
    user: ManagedUser;
    action: AdminAction;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      async () => {
        setLoading(true);
        setError("");
        try {
          const result = await read<UserPage>(
            `/api/admin/users?${new URLSearchParams({ q: query, status, order, page: String(page) })}`,
            controller.signal,
          );
          if (controller.signal.aborted) return;
          setData(result);
          if (!result.users.length && page > 1) setPage(Math.max(1, page - 1));
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
  }, [query, status, order, page, reload]);

  useEffect(() => {
    const controller = new AbortController();
    read<RegistrationSeries>(
      `/api/admin/registrations?days=${days}`,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setChartError("");
          setRegistrations(result);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setChartError(error.message);
      });
    return () => controller.abort();
  }, [days, reload]);

  useEffect(() => {
    const controller = new AbortController();
    read<{ events: AuditEntry[] }>("/api/admin/audit", controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setAuditError("");
          setAudit(result.events);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setAuditError(error.message);
      });
    return () => controller.abort();
  }, [reload]);

  function choose(user: ManagedUser, action: AdminAction) {
    setSelected({ user, action });
    setReason("");
    setActionError("");
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || busy) return;
    setBusy(true);
    setActionError("");
    try {
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(selected.user.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: selected.action,
            reason,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not complete this action");
      notify(
        "success",
        `${ACTION_NAMES[selected.action]} completed for ${selected.user.email}.`,
      );
      setSelected(null);
      setReload((value) => value + 1);
    } catch (error) {
      setActionError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <BugReportInbox />
      <section className="card p-4 sm:p-6" aria-label="Registration activity">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="t-heading">Registrations</h2>
          <label className="flex items-center gap-2 text-[0.75rem] text-[var(--ink-secondary)]">
            Period
            <select
              aria-label="Registration period"
              className="select !w-auto"
              value={days}
              onChange={(event) => {
                setChartError("");
                setDays(Number(event.target.value));
              }}
            >
              {[7, 30, 90, 365].map((period) => (
                <option key={period} value={period}>
                  Last {period} days
                </option>
              ))}
            </select>
          </label>
        </div>
        {chartError ? (
          <p role="alert" className="t-small text-[var(--danger)]">
            {chartError}
          </p>
        ) : registrations?.days === days ? (
          <RegistrationChart data={registrations} />
        ) : (
          <p className="t-small" role="status">
            Loading registration history…
          </p>
        )}
      </section>

      <section
        className="card p-4 sm:p-6"
        aria-label="Registered users"
        aria-busy={loading}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="t-heading">
            Registered users{" "}
            {data && (
              <span className="font-normal text-[var(--ink-muted)]">
                ({data.total})
              </span>
            )}
          </h2>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setReload((value) => value + 1)}
            disabled={busy}
          >
            Refresh
          </button>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <Field label="Search users">
            <input
              type="search"
              className="input"
              placeholder="Name or email"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field label="Access">
            <select
              aria-label="Access"
              className="select"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All accounts</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
            </select>
          </Field>
          <Field label="Order">
            <select
              aria-label="Order"
              className="select"
              value={order}
              onChange={(event) => {
                setOrder(event.target.value);
                setPage(1);
              }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </Field>
        </div>
        {error && (
          <p
            role="alert"
            className="mb-3 text-[0.8125rem] text-[var(--danger)]"
          >
            {error}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[45rem] text-left text-[0.8125rem]">
            <thead className="text-[var(--ink-muted)]">
              <tr>
                <th className="pb-3 pr-4 font-medium">User</th>
                <th className="pb-3 pr-4 font-medium">Registered</th>
                <th className="pb-3 pr-4 font-medium">Access</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.users.map((user) => {
                const protectedUser =
                  user.role === "SUPERADMIN" || user.id === currentUserId;
                return (
                  <tr
                    key={user.id}
                    className="border-t border-[var(--hairline)] align-top"
                  >
                    <td className="py-3 pr-4">
                      <p className="font-medium">
                        {user.name || "Unnamed account"}
                      </p>
                      <p className="mt-1 break-all text-[0.75rem] text-[var(--ink-muted)]">
                        {user.email}
                      </p>
                      {protectedUser && (
                        <span className="chip chip-accent mt-1">
                          Superadmin · your account
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-[0.75rem] text-[var(--ink-secondary)]">
                      {timestamp(user.createdAt)}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`chip status-dot ${user.bannedAt ? "status-off" : "status-live"}`}
                      >
                        {user.bannedAt ? "Banned" : "Active"}
                      </span>
                      {user.bannedAt && (
                        <p className="mt-1 text-[0.6875rem] text-[var(--ink-muted)]">
                          Since {timestamp(user.bannedAt)}
                        </p>
                      )}
                      {user.banReason && (
                        <p className="mt-1 max-w-xs break-words text-[0.75rem] text-[var(--ink-secondary)]">
                          {user.banReason}
                        </p>
                      )}
                    </td>
                    <td className="py-3">
                      {protectedUser ? (
                        <span className="text-[0.75rem] text-[var(--ink-muted)]">
                          Protected
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={busy || loading}
                            aria-label={`${user.bannedAt ? "Restore access for" : "Ban"} ${user.email}`}
                            onClick={() =>
                              choose(user, user.bannedAt ? "UNBAN" : "BAN")
                            }
                          >
                            {user.bannedAt ? "Restore access" : "Ban"}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={busy || loading}
                            aria-label={`Sign out ${user.email} everywhere`}
                            onClick={() => choose(user, "REVOKE_SESSIONS")}
                          >
                            Sign out everywhere
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!loading && !data?.users.length && !error && (
          <p className="py-6 text-center text-[0.8125rem] text-[var(--ink-muted)]">
            No accounts match these filters.
          </p>
        )}
        {loading && (
          <p
            role="status"
            className="mt-3 text-[0.75rem] text-[var(--ink-muted)]"
          >
            Loading accounts…
          </p>
        )}
        {data && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--hairline)] pt-4 text-[0.75rem]">
            <span className="text-[var(--ink-secondary)]">
              Page {page} of{" "}
              {Math.max(1, Math.ceil(data.total / data.pageSize))}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={page <= 1 || loading}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={page * data.pageSize >= data.total || loading}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="card p-4 sm:p-6" aria-label="Administrative activity">
        <h2 className="t-heading mb-3">Recent administrative actions</h2>
        {auditError ? (
          <p role="alert" className="t-small">
            {auditError}
          </p>
        ) : audit.length ? (
          <ol className="divide-y divide-[var(--hairline)]">
            {audit.map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3 text-[0.75rem]"
              >
                <time
                  className="text-[var(--ink-muted)]"
                  dateTime={event.createdAt}
                >
                  {timestamp(event.createdAt)}
                </time>
                <span className="font-medium">
                  {AUDIT_NAMES[event.action] ?? event.action}
                </span>
                <span className="break-all text-[var(--ink-secondary)]">
                  {event.target?.email ?? "Deleted account"}
                </span>
                {event.reason && (
                  <span className="w-full break-words text-[var(--ink-muted)]">
                    {event.reason}
                  </span>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="t-small">No administrative actions yet.</p>
        )}
      </section>

      {selected && (
        <Modal
          title={ACTION_NAMES[selected.action]}
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <form onSubmit={submit} className="flex flex-col gap-4">
            <p className="break-all text-[0.875rem] font-medium">
              {selected.user.email}
            </p>
            <p className="text-[0.8125rem] leading-relaxed text-[var(--ink-secondary)]">
              {selected.action === "BAN"
                ? "Blocks access to this account and its workspace. The owner and invited team members are signed out. Their data is kept."
                : selected.action === "UNBAN"
                  ? "Restores sign-in to this account and its workspace. Previously revoked sessions remain signed out."
                  : "Ends current sessions for this account and its invited team members. They can sign in again."}
            </p>
            {selected.action === "BAN" && (
              <Field label="Reason (optional)">
                <textarea
                  autoFocus
                  className="input min-h-20"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={500}
                  placeholder="Why is this account being banned?"
                />
              </Field>
            )}
            {actionError && (
              <p role="alert" className="text-[0.75rem] text-[var(--danger)]">
                {actionError}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={() => setSelected(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={
                  selected.action === "BAN" ? "btn-danger" : "btn-primary"
                }
                disabled={busy}
              >
                {busy ? "Working…" : ACTION_NAMES[selected.action]}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Field, Modal } from "@/components/ui";
import { useFeedback } from "@/components/Feedback";
import { BUG_REPORT_LIMITS } from "@/lib/bug-report-types";

export function ReportBugButton() {
  const { notify } = useFeedback();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/bug-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not send your report");
      setOpen(false);
      setSubject("");
      setMessage("");
      notify(
        "success",
        `Bug report #${result.id.slice(-8).toUpperCase()} sent to the administrator.`,
      );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        Report a bug
      </button>
      {open &&
        createPortal(
          <Modal
            title="Report a bug"
            onClose={() => {
              if (!busy) setOpen(false);
            }}
          >
            <form onSubmit={submit} className="flex flex-col gap-4">
              <p className="t-small">
                Tell us what happened, what you expected and how to reproduce
                it. Your name and account details will be included
                automatically.
              </p>
              <p className="t-small">
                Text only. Please do not include passwords or other secrets.
              </p>
              <Field label="Subject">
                <input
                  aria-label="Subject"
                  disabled={busy}
                  autoFocus
                  required
                  className="input"
                  maxLength={BUG_REPORT_LIMITS.subject}
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Briefly describe the problem"
                />
              </Field>
              <Field label="Description">
                <textarea
                  aria-label="Description"
                  disabled={busy}
                  required
                  className="input min-h-40"
                  maxLength={BUG_REPORT_LIMITS.message}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Steps to reproduce, expected result and actual result"
                />
              </Field>
              {error && (
                <p
                  role="alert"
                  className="text-[0.8125rem] text-[var(--danger)]"
                >
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={busy || !subject.trim() || !message.trim()}
                >
                  {busy ? "Sending…" : "Send report"}
                </button>
              </div>
            </form>
          </Modal>,
          document.body,
        )}
    </>
  );
}

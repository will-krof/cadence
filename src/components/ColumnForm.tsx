"use client";

import { useState } from "react";
import { COLUMN_COLORS, MAX_COLUMN_NAME } from "@/lib/types";

/** Shared status creation for Timeline and Tracker. */
export function ColumnForm({
  onCreate,
  autoFocus = false,
  onDone,
}: {
  onCreate: (input: {
    name: string;
    color?: string;
    isDone?: boolean;
  }) => Promise<unknown>;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(COLUMN_COLORS[0]);
  const [isDone, setIsDone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    const created = await onCreate({ name: trimmed, color, isDone });
    setSaving(false);
    if (!created) return;
    setName("");
    setIsDone(false);
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <input
        value={name}
        autoFocus={autoFocus}
        maxLength={MAX_COLUMN_NAME}
        onChange={(e) => setName(e.target.value)}
        placeholder="Column name"
        aria-label="Column name"
        className="input"
      />
      <div className="flex flex-wrap gap-1.5">
        {COLUMN_COLORS.map((swatch) => (
          <button
            key={swatch}
            type="button"
            onClick={() => setColor(swatch)}
            className={`h-5 w-5 rounded-full border transition ${
              color === swatch
                ? "border-[var(--ink)]"
                : "border-transparent hover:border-[var(--baseline)]"
            }`}
            style={{ background: swatch }}
            aria-label={`Colour it ${swatch}`}
            aria-pressed={color === swatch}
          />
        ))}
      </div>
      <label className="flex items-center gap-2 text-[0.75rem] text-[var(--ink-secondary)]">
        <input
          type="checkbox"
          checked={isDone}
          onChange={(e) => setIsDone(e.target.checked)}
        />
        Work here is finished
      </label>
      <button
        type="submit"
        disabled={!name.trim() || saving}
        className="btn-primary disabled:opacity-40"
      >
        {saving ? "Adding…" : "Add column"}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useBoard } from "@/components/BoardProvider";
import { ColumnForm } from "@/components/ColumnForm";
import { Modal } from "@/components/ui";
import {
  COLUMN_COLORS,
  MAX_COLUMN_NAME,
  type ProjectColumn,
} from "@/lib/types";

export function TimelineColumns({ onClose }: { onClose: () => void }) {
  const { activeProject, columns, createColumn, updateColumn } = useBoard();
  const [adding, setAdding] = useState(columns.length === 0);
  if (!activeProject) return null;
  return (
    <Modal title="Timeline columns" onClose={onClose}>
      <p className="t-small mb-4">
        Statuses are shared by the Timeline and Tracker. You can use them with
        Tracker switched off.
      </p>
      <div className="space-y-3">
        {columns.map((column) => (
          <ColumnEditor
            key={`${column.id}:${column.name}:${column.color}:${column.isDone}`}
            column={column}
            onSave={(patch) => updateColumn(activeProject.id, column.id, patch)}
          />
        ))}
      </div>
      <div className="mt-4 border-t border-[var(--hairline)] pt-4">
        {adding ? (
          <>
            <ColumnForm
              autoFocus
              onCreate={(input) => createColumn(activeProject.id, input)}
              onDone={() => setAdding(false)}
            />
            <button
              type="button"
              className="btn-secondary mt-2"
              onClick={() => setAdding(false)}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn-primary"
            disabled={columns.length >= 20}
            onClick={() => setAdding(true)}
          >
            Add column
          </button>
        )}
      </div>
    </Modal>
  );
}

function ColumnEditor({
  column,
  onSave,
}: {
  column: ProjectColumn;
  onSave: (patch: {
    name: string;
    color: string;
    isDone: boolean;
  }) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="card space-y-2 p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (saving) return;
        const data = new FormData(e.currentTarget);
        const name = String(data.get("name") ?? "").trim();
        if (!name) return;
        setSaving(true);
        try {
          await onSave({
            name,
            color: String(data.get("color")),
            isDone: data.get("done") === "on",
          });
        } finally {
          setSaving(false);
        }
      }}
    >
      <label className="field-label">
        Column name
        <input
          name="name"
          aria-label={`Name of ${column.name}`}
          defaultValue={column.name}
          required
          maxLength={MAX_COLUMN_NAME}
          className="input mt-1 w-full"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <label className="field-label">
          Colour
          <select
            name="color"
            aria-label={`Colour of ${column.name}`}
            defaultValue={column.color}
            className="input ml-2"
          >
            <option value={column.color}>{column.color}</option>
            {COLUMN_COLORS.filter((c) => c !== column.color).map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" name="done" defaultChecked={column.isDone} />
          Work here is finished
        </label>
        <button type="submit" className="btn-secondary" disabled={saving}>
          {saving ? "Saving…" : "Save column"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useBoard } from "@/components/BoardProvider";
import { AssigneePicker } from "@/components/ui";

export function BulkAssignment({
  projectId,
  taskIds,
  onClear,
}: {
  projectId: string;
  taskIds: string[];
  onClear: () => void;
}) {
  const { assignable, bulkAssignTasks } = useBoard();
  const [people, setPeople] = useState<string[]>([]);
  const [mode, setMode] = useState<"add" | "replace">("add");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selected = assignable.filter((person) => people.includes(person.id));
  return (
    <div
      className="flex min-w-0 flex-1 flex-wrap items-center gap-3"
      aria-label="Bulk task assignment"
    >
      <span className="text-xs tabular-nums" role="status">
        {taskIds.length} selected
      </span>
      <div className="w-44 shrink-0">
        <select
          className="input"
          aria-label="Assignment mode"
          value={mode}
          disabled={saving}
          onChange={(e) => {
            setMode(e.target.value as "add" | "replace");
            setError("");
          }}
        >
          <option value="add">Add people</option>
          <option value="replace">Replace assignees</option>
        </select>
      </div>
      <AssigneePicker
        assignees={selected}
        developers={assignable}
        onChange={(ids) => {
          setPeople(ids);
          setError("");
        }}
        taskTitle="selected tasks"
        emptyLabel="Choose people"
        disabled={saving}
      />
      <button
        type="button"
        className="btn-primary"
        disabled={saving || !selected.length || taskIds.length > 500}
        onClick={async () => {
          setSaving(true);
          setError("");
          const problem = await bulkAssignTasks(
            projectId,
            taskIds,
            selected.map((p) => p.id),
            mode,
          );
          setSaving(false);
          if (problem) setError(problem);
          else onClear();
        }}
      >
        {saving ? "Assigning…" : "Assign selected"}
      </button>
      <button
        type="button"
        className="btn-secondary"
        disabled={saving}
        onClick={onClear}
      >
        Clear selection
      </button>
      <p className="t-micro w-full">
        {mode === "add"
          ? "Existing assignees are kept."
          : "This replaces all assignees on the selected tasks."}{" "}
        Up to four people per task; all selected tasks update together.
      </p>
      {taskIds.length > 500 && (
        <p role="alert" className="t-small w-full text-[var(--danger)]">
          Select up to 500 tasks at a time.
        </p>
      )}
      {error && (
        <p role="alert" className="t-small w-full text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

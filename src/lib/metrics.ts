import type { ProjectMetricValues } from "./metrics-types";

export interface MetricTask {
  id: string;
  createdAt: Date;
  endDate: Date | null;
  column: { isDone: boolean } | null;
  assignees: { developer: { id: string; name: string; color: string } }[];
}

/** All task rows count, including subtasks. Reopened tasks do not count as done. */
export function buildProjectMetrics(
  tasks: MetricTask[],
  completions: { taskId: string; at: Date }[],
  now = new Date(),
): Required<ProjectMetricValues> {
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const from = new Date(today - 6 * 86400000);
  const finished = new Map<string, Date>();
  for (const event of completions) {
    if (event.at > now) continue;
    if (!finished.has(event.taskId) || finished.get(event.taskId)! < event.at)
      finished.set(event.taskId, event.at);
  }
  let done = 0,
    overdue = 0,
    datedOpen = 0,
    recent = 0,
    unassigned = 0;
  const durations: number[] = [];
  const people = new Map<
    string,
    { id: string; name: string; color: string; openTasks: number }
  >();
  for (const task of tasks) {
    if (task.column?.isDone) {
      done++;
      const completedAt = finished.get(task.id);
      if (completedAt && completedAt >= task.createdAt) {
        if (completedAt >= from) recent++;
        durations.push(
          (completedAt.getTime() - task.createdAt.getTime()) / 86400000,
        );
      }
      continue;
    }
    if (task.endDate) {
      datedOpen++;
      if (
        Date.UTC(
          task.endDate.getUTCFullYear(),
          task.endDate.getUTCMonth(),
          task.endDate.getUTCDate(),
        ) < today
      )
        overdue++;
    }
    const unique = new Map(
      task.assignees.map(({ developer }) => [developer.id, developer]),
    );
    if (!unique.size) unassigned++;
    for (const person of unique.values()) {
      const entry = people.get(person.id) ?? { ...person, openTasks: 0 };
      entry.openTasks++;
      people.set(person.id, entry);
    }
  }
  return {
    progress: {
      percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
      done,
      total: tasks.length,
    },
    overdue: { count: overdue, datedOpen },
    completed: {
      count: recent,
      from: from.toISOString(),
      to: now.toISOString(),
    },
    completionTime: {
      days: durations.length
        ? durations.reduce((sum, value) => sum + value, 0) / durations.length
        : null,
      sample: durations.length,
      untracked: done - durations.length,
    },
    workload: {
      totalOpen: tasks.length - done,
      unassigned,
      people: [...people.values()].sort(
        (a, b) =>
          b.openTasks - a.openTasks ||
          a.name.localeCompare(b.name) ||
          a.id.localeCompare(b.id),
      ),
    },
  };
}

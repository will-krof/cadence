import type { BurndownData } from "./metrics-types";

type Task = { id: string; createdAt: Date; column: { isDone: boolean } | null };
type Event = {
  id: string;
  taskId: string;
  at: Date;
  column: { isDone: boolean } | null;
};
const DAY = 86400000;
const day = (date: Date) =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

/** Daily UTC observations of surviving tasks. Unknown history stays unknown.
 * Column completion rules are interpreted as configured now; deleted tasks
 * and historical sprint membership cannot be reconstructed from TaskEvent.
 */
export function buildBurndown(
  tasks: Task[],
  events: Event[],
  span: { startDate: Date | null; endDate: Date | null },
  now = new Date(),
): BurndownData {
  const today = day(now);
  const firstTask = tasks.reduce(
    (first, task) => Math.min(first, day(task.createdAt)),
    today,
  );
  const start = span.startDate ? day(span.startDate) : firstTask;
  const deadline = span.endDate ? day(span.endDate) : null;
  const end = Math.max(start, today, deadline ?? today);
  // Bound response/render size for long projects, always including today.
  const count = Math.min(120, Math.round((end - start) / DAY));
  const days = new Set<number>([start, end]);
  for (let i = 1; i < count; i++)
    days.add(start + Math.round((((end - start) / DAY) * i) / count) * DAY);
  if (today >= start) days.add(today);
  const history = new Map<string, Event[]>();
  for (const event of [...events].sort(
    (a, b) => +a.at - +b.at || a.id.localeCompare(b.id),
  )) {
    const rows = history.get(event.taskId) ?? [];
    rows.push(event);
    history.set(event.taskId, rows);
  }
  const cursors = new Map<string, number>();
  const unknownTasks = new Set<string>();
  const points = [...days]
    .sort((a, b) => a - b)
    .map((date) => {
      const cutoff = Math.min(date + DAY - 1, +now);
      let remaining = 0,
        scope = 0,
        unknown = false;
      for (const task of tasks) {
        if (+task.createdAt > cutoff) continue;
        scope++;
        if (date === today) {
          if (!task.column?.isDone) remaining++;
          continue;
        }
        if (date > today) continue;
        const rows = history.get(task.id) ?? [];
        let index = cursors.get(task.id) ?? -1;
        while (index + 1 < rows.length && +rows[index + 1].at <= cutoff)
          index++;
        cursors.set(task.id, index);
        const event = rows[index];
        if (!event?.column || event.at < task.createdAt) {
          unknown = true;
          unknownTasks.add(task.id);
        } else if (!event.column.isDone) remaining++;
      }
      return {
        date: new Date(date).toISOString().slice(0, 10),
        remaining: date > today || unknown ? null : remaining,
        scope,
        ideal: null as number | null,
      };
    });
  const baseline = points[0]?.remaining ?? null;
  if (deadline !== null && deadline >= start && baseline !== null) {
    for (const point of points) {
      const date = +new Date(point.date);
      point.ideal =
        deadline === start
          ? 0
          : Math.max(0, baseline * (1 - (date - start) / (deadline - start)));
    }
  }
  return {
    points,
    deadline:
      deadline === null ? null : new Date(deadline).toISOString().slice(0, 10),
    missingHistory: unknownTasks.size,
    totalTasks: tasks.length,
  };
}

/** A range follows the visible, ordered rows, including virtualized rows. */
export function toggleTaskSelection(
  order: string[],
  selected: string[],
  anchor: string | null,
  id: string,
  range: boolean,
) {
  const start = anchor ? order.indexOf(anchor) : -1;
  const end = order.indexOf(id);
  if (end < 0) return selected;
  const visible = new Set(order);
  const next = new Set(selected.filter((value) => visible.has(value)));
  if (range && start >= 0) {
    for (const value of order.slice(
      Math.min(start, end),
      Math.max(start, end) + 1,
    ))
      next.add(value);
  } else if (next.has(id)) next.delete(id);
  else next.add(id);
  return [...next];
}

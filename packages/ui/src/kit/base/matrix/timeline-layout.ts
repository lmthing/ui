import type { Cell } from "./matrix-layout";

type Slot = { start: number; span: number; cell?: Cell };

/** Out-of-range and overlapping cells are not drawn. Sort without restamping caller item ids. */
export function timelineLayout(cells: readonly Cell[], columns: number): Slot[] {
  const ordered = cells
    .flatMap((cell) => {
      const { start, span } = cell;
      return start !== undefined &&
        span !== undefined &&
        Number.isInteger(start) &&
        Number.isInteger(span) &&
        start >= 0 &&
        span >= 1 &&
        start + span <= columns
        ? [{ start, span, cell }]
        : [];
    })
    .sort((a, b) => a.start - b.start);
  const slots: Slot[] = [];
  let cursor = 0;
  for (const slot of ordered) {
    if (slot.start < cursor) continue;
    if (slot.start > cursor) slots.push({ start: cursor, span: slot.start - cursor });
    slots.push(slot);
    cursor = slot.start + slot.span;
  }
  if (cursor < columns) slots.push({ start: cursor, span: columns - cursor });
  return slots;
}

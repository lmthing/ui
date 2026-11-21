import { z } from "zod";
import { numberLine, placeholderValue, text, wordsFor, type DeviceData } from "../../../catalog";
import { placesWordsFor } from "../lang";

const rowKey = z.object({ line: text(6), to: text(28) });
type Row = z.output<typeof rowKey>;
type Board<T> = { stop: string; rows: readonly T[]; detail?: "full" | "brief" | undefined };
const minutes = z.int().nonnegative().optional().catch(undefined);
const snapshot = z.object({
  stop: text(32),
  rows: z
    .array(rowKey.extend({ minutes, delay: minutes }))
    .min(1)
    .max(6),
  total: z.int().nonnegative().optional().catch(undefined),
});

// Bind transit data to this exact board, including the order of repeated line/destination pairs.
function snapshotOf({ stop, rows }: Board<Row>, data?: DeviceData) {
  for (const record of data?.departures ?? []) {
    const result = snapshot.safeParse(record);
    if (!result.success) continue;
    const current = result.data;
    if (
      current.stop === stop &&
      current.rows.length === rows.length &&
      current.rows.every(({ line, to }, index) => line === rows[index]?.line && to === rows[index]?.to)
    )
      return current;
  }
}

export function departuresCopy<T extends Row>(input: Board<T>, data?: DeviceData, lang?: string) {
  const words = placesWordsFor(lang);
  const current = snapshotOf(input, data);
  const remaining = (current?.total ?? 0) - input.rows.length;
  return {
    more: remaining > 0 ? wordsFor(lang).peekCount(numberLine(remaining, lang)) : undefined,
    rows: input.rows.map((row, index) => {
      const live = current?.rows[index];
      const minutes = live?.minutes;
      const overdue = live?.delay ?? 0;
      const delayed = overdue > 0;
      const time =
        minutes === undefined
          ? undefined
          : minutes === 0
            ? words.departureDue
            : words.departureMinutes(numberLine(minutes, lang));
      const late = delayed && input.detail === "brief" ? words.departureLate(time !== undefined) : undefined;
      const shown = time ?? (late ? "" : placeholderValue);
      const delay = delayed && !late ? words.departureDelay(numberLine(overdue, lang)) : undefined;
      const countdown = shown + (late ?? "");
      return {
        ...row,
        minutes: shown,
        late,
        countdown,
        delay,
        tone: delayed ? ("warn" as const) : time === undefined ? ("muted" as const) : ("good" as const),
        label: words.departureLabel(row.line, row.to, countdown, delay),
      };
    }),
  };
}

export function departuresReading(input: Board<Row>, data?: DeviceData, lang?: string): string[] {
  const words = placesWordsFor(lang);
  const { rows, more } = departuresCopy(input, data, lang);
  return [
    ...rows.map(({ line, to, countdown, delay }) => words.departureReading(line, to, countdown, delay)),
    ...(more ? [more] : []),
  ];
}

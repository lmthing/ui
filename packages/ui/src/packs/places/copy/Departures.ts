import { z } from "zod";
import { numberLine, text, wordsFor, type DeviceData } from "../../../catalog";
import { placesWordsFor } from "../lang";

const rowKey = z.object({ line: text(6), to: text(28) });
type Row = z.output<typeof rowKey> & { crowding?: "low" | "medium" | "high" | undefined };
type Alert = { line: string; severity: "info" | "warn" | "critical"; text: string };
type Board<T> = {
  stop: string;
  rows: readonly T[];
  detail?: "full" | "brief" | undefined;
  alerts?: readonly Alert[] | undefined;
};
const statusTones = {
  info: "muted",
  warn: "warn",
  critical: "bad",
  low: "muted",
  medium: "text",
  high: "warn",
} as const;
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
  const { peekCount, placeholderValue } = wordsFor(lang);
  const current = snapshotOf(input, data);
  const remaining = (current?.total ?? 0) - input.rows.length;
  return {
    more: remaining > 0 ? peekCount(numberLine(remaining, lang)) : undefined,
    alerts: (input.alerts ?? []).map(({ line, severity, text }) => ({
      title: words.departureAlert(line, words.departureSeverity[severity]),
      text,
      tone: statusTones[severity],
    })),
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
      const crowd = row.crowding && {
        text: words.departureCrowding[row.crowding],
        tone: statusTones[row.crowding],
      };
      return {
        ...row,
        minutes: shown,
        late,
        countdown,
        delay,
        crowd,
        tone: delayed ? ("warn" as const) : time === undefined ? ("muted" as const) : ("good" as const),
        label: words.departureLabel(row.line, row.to, countdown, delay, crowd?.text),
      };
    }),
  };
}

export function departuresReading(input: Board<Row>, data?: DeviceData, lang?: string): string[] {
  const words = placesWordsFor(lang);
  const { rows, more, alerts } = departuresCopy(input, data, lang);
  return [
    ...rows.map(({ line, to, countdown, delay, crowd }) =>
      words.departureReading(line, to, countdown, delay, crowd?.text),
    ),
    ...alerts.map(({ title, text }) => words.departureAlertReading(title, text)),
    ...(more ? [more] : []),
  ];
}

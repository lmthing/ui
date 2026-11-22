import { numberLine, type StateName } from "../../../catalog";
import { eventsWordsFor } from "../lang";

export type SeatingEntry =
  | { kind: "table"; label: string; shape: "round" | "long"; seats: number; disclosure: readonly string[] }
  | { kind: "guest"; name: string; at: number | null };
type Table = Extract<SeatingEntry, { kind: "table" }> & { id: string };
type Guest = Extract<SeatingEntry, { kind: "guest" }> & { id: string };

export function groupSeating(entries: readonly (SeatingEntry & { id?: string })[]) {
  const rows = entries.map((row, index) => ({ ...row, id: row.id ?? `r${index + 1}` }));
  const unseated: Guest[] = [];
  const tables = rows
    .filter((row): row is Table => row.kind === "table")
    .map((row) => ({ ...row, guests: [] as Guest[] }));
  for (const row of rows) {
    if (row.kind !== "guest") continue;
    if (row.at === null) unseated.push(row);
    else tables[row.at]?.guests.push(row);
  }
  return { tables, unseated };
}

export function seatInitials(name: string, lang?: string) {
  return name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((word) => [...word][0] ?? "")
    .join("")
    .toLocaleUpperCase(lang);
}

export function seatingFigures(used: number, total: number, lang?: string) {
  return eventsWordsFor(lang).seating.figures(numberLine(used, lang), numberLine(total, lang));
}

export function seatingCount(used: number, total: number, lang?: string) {
  const words = eventsWordsFor(lang).seating;
  return words.count(seatingFigures(used, total, lang), words.filled);
}

export function seatingTotals(tables: ReturnType<typeof groupSeating>["tables"]): [number, number] {
  return [tables.reduce((n, t) => n + t.guests.length, 0), tables.reduce((n, t) => n + t.seats, 0)];
}

export function seatingReading(input: unknown, state: StateName, lang?: string) {
  const words = eventsWordsFor(lang).seating;
  if (state !== "filled") return [];
  const { entries, detail } = input as { entries: readonly SeatingEntry[]; detail?: string };
  const { tables, unseated } = groupSeating(entries);
  return [
    words.title,
    ...(detail === "brief" ? [] : [seatingCount(...seatingTotals(tables), lang)]),
    ...tables.flatMap(({ id, label, seats, guests }) => [
      words.table(id, label, seatingCount(guests.length, seats, lang)),
      ...guests.map((row) => words.guest(row.id, row.name, label, seatInitials(row.name, lang))),
    ]),
    words.tray(numberLine(unseated.length, lang)),
    ...unseated.map((row) => words.guest(row.id, row.name, words.unseated)),
  ];
}

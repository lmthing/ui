import { z } from "zod";
import {
  appointmentDate,
  dateLocaleOf,
  emptyLine,
  numberLine,
  timeOfDayLine,
  type DeviceData,
  type Values,
} from "../../../catalog";
import { eventsWordsFor } from "../lang";

const replies = ["yes", "maybe", "no"] as const;
export const dateAnswer = z.enum([...replies, "none"]);
export const fittedDates = 3;
const viewer = z.object({ instance: z.string(), row: z.int().nonnegative() });
export const dateReplyChoices = replies.map((value) => ({
  value,
  label: eventsWordsFor().findDate.answer[value],
}));

type DateAnswer = z.output<typeof dateAnswer>;
type DateSlot = { date: string; time?: string | undefined };
type Participant = { name: string; answers: DateAnswer[] };
type DateCell = { row: number; column: number; answer: (typeof replies)[number] | undefined; own: boolean };
type StampedCell = DateCell & { id: string };
type Matrix = { dates: DateSlot[]; people: Participant[]; cells: StampedCell[]; detail?: string };

export function dateCells(people: Participant[]): DateCell[] {
  return people.flatMap(({ answers }, row) =>
    answers.map((answer, column) => ({
      row,
      column,
      answer: answer === "none" ? undefined : answer,
      own: false,
    })),
  );
}

export function projectDateViewer(input: Readonly<Values>, instance: string, { eventViewer }: DeviceData) {
  const { people, cells } = input as Matrix;
  const bindings = (eventViewer ?? []).map((record) => viewer.safeParse(record).data);
  const matches = bindings.filter((binding) => binding?.instance === instance);
  const row = matches.length === 1 ? matches[0]?.row : undefined;
  return {
    cells: cells.map((cell) => ({ ...cell, own: cell.row === row && row < people.length })),
  };
}

export function dateMatrix({ dates, cells }: { dates: DateSlot[]; cells: DateCell[] }, lang?: string) {
  const { findDate: words } = eventsWordsFor(lang);
  const oneYear = dates.every(({ date }) => date.slice(0, 4) === dates[0]!.date.slice(0, 4));
  const hasTimes = dates.some(({ time }) => time);
  const locale = dateLocaleOf(lang);
  const shortDay = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const year = !oneYear && new Intl.DateTimeFormat(locale, { year: "numeric", timeZone: "UTC" });
  const slots = dates.map(({ date, time }) => {
    const instant = new Date(`${date}T00:00:00Z`);
    const at = time && timeOfDayLine(time, lang);
    return {
      heading: shortDay.format(instant),
      details: [...(year ? [year.format(instant)] : []), ...(hasTimes ? [at] : [])],
      label: words.slot(appointmentDate(date, lang), at),
    };
  });
  const scores = slots.map((_, column) => ({ column, yes: 0, maybe: 0 }));
  for (const { column, answer } of cells) {
    if (answer === "yes" || answer === "maybe") scores[column]![answer]++;
  }
  const best = scores.reduce((a, b) => (b.yes > a.yes || (b.yes === a.yes && b.maybe > a.maybe) ? b : a));
  return {
    slots,
    bestColumn: best.yes || best.maybe ? best.column : undefined,
    title: best.yes || best.maybe ? words.best(slots[best.column]!.label) : words.noVotes,
    count:
      best.yes || best.maybe
        ? words.count(numberLine(best.yes, lang), numberLine(best.maybe, lang))
        : undefined,
  };
}

export function dateMatrixReading(input: unknown, state: string, lang?: string): string[] {
  const { findDate: words } = eventsWordsFor(lang);
  if (state !== "filled") return state === "empty" ? [emptyLine(words.dateThing, lang)] : [];
  const matrix = input as Matrix;
  const { slots, title, count } = dateMatrix(matrix, lang);
  return [
    title,
    ...(count ? [count] : []),
    words.people,
    words.agenda(slots.map(({ label }) => label)),
    ...(slots.length > fittedDates ? [words.scroll] : []),
    ...(matrix.detail !== "brief" && matrix.cells.some(({ own }) => own) ? [words.guide] : []),
    ...matrix.people.map(({ name }, row) =>
      words.person(
        name,
        matrix.cells.filter((cell) => cell.row === row).map(({ answer }) => words.answer[answer ?? "none"]),
      ),
    ),
    ...matrix.cells
      .filter(({ own }) => own)
      .map(({ id, row, column, answer }) =>
        words.cell(
          id,
          matrix.people[row]!.name,
          slots[column]!.label,
          answer === undefined ? words.reply : undefined,
        ),
      ),
  ];
}

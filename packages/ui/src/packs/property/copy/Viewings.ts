import { appointmentDate, durationLine, timeOfDayLine } from "../../../catalog";
import { propertyWordsFor, type PropertyWords } from "../lang";

export const outcomes = ["attended", "no_show"] as const;
export type ViewingStatus = keyof PropertyWords["viewings"]["statuses"];
export type Viewing = {
  unit: string;
  prospect: string;
  start: string;
  minutes: number;
  status: ViewingStatus;
  note?: string | undefined;
  active: boolean;
  upcoming: boolean;
  canRecord: boolean;
};

export function orderedViewings<T extends { start: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

export function viewingTimes(start: string, minutes: number, lang?: string) {
  const words = propertyWordsFor(lang).viewings;
  const day = start.slice(0, 10);
  const at = Date.parse(start);
  const offset = Date.parse(start.replace(/(?:Z|[+-]\d{2}:\d{2})$/, "Z")) - at;
  const end = new Date(at + minutes * 60_000).toISOString();
  const local = new Date(Date.parse(end) + offset).toISOString();
  const endDay = local.slice(0, 10);
  const endClock = timeOfDayLine(local.slice(11, 16), lang);
  return {
    end,
    startLabel: words.start(appointmentDate(day, lang), timeOfDayLine(start.slice(11, 16), lang)),
    endLabel: words.end(
      endDay === day ? endClock : words.nextDay(appointmentDate(endDay, lang), endClock),
      durationLine(minutes, lang),
    ),
  };
}

export function viewingActions({ active, upcoming, status }: Viewing) {
  return { confirm: upcoming && status === "proposed", invite: upcoming, edit: upcoming, cancel: active };
}

export function viewingGates({ start, status }: Pick<Viewing, "start" | "status">, now: number) {
  const future = Date.parse(start) > now;
  const active = status === "proposed" || status === "confirmed";
  return { active, upcoming: active && future, canRecord: !future && status !== "cancelled" };
}

export function viewingStatus(row: Viewing, outcome: unknown): ViewingStatus {
  return row.canRecord && (outcome === "attended" || outcome === "no_show") ? outcome : row.status;
}

export function viewingReading(
  rows: readonly (Viewing & { id?: string })[],
  state: string,
  lang?: string,
  liveValue?: (part: string) => unknown,
) {
  const words = propertyWordsFor(lang).viewings;
  const sorted = orderedViewings(rows.map((row, index) => ({ ...row, id: row.id ?? `r${index + 1}` })));
  return [
    ...(state === "success" ? [words.success] : []),
    ...sorted.map((row) => {
      const { startLabel, endLabel, end } = viewingTimes(row.start, row.minutes, lang);
      const actions = Object.entries(viewingActions(row)).flatMap(([part, offered]) =>
        offered && state === "filled" ? [words.actions[part as keyof typeof words.actions]] : [],
      );
      return [
        row.id,
        row.unit,
        row.prospect,
        row.start,
        end,
        startLabel,
        endLabel,
        words.statuses[viewingStatus(row, liveValue?.(`${row.id}/outcome`))],
        row.active && !row.upcoming ? words.past : undefined,
        row.note,
        ...(state === "filled" && row.canRecord
          ? [words.outcome, ...outcomes.map((outcome) => words.statuses[outcome])]
          : []),
        ...actions,
      ]
        .filter(Boolean)
        .join(" · ");
    }),
  ];
}

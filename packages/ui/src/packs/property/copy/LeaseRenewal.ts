import { z } from "zod";
import {
  appointmentDate,
  changeLine,
  defineLocalState,
  localeOf,
  moneyLine,
  numberLine,
  pluralForm,
  type AppCurrency,
  type StateName,
} from "../../../catalog";
import { propertyWordsFor } from "../lang";

export const renewalNoteMax = 120;
export const renewalStatuses = z.enum(["sent", "accepted", "countered", "declined"]);
type Status = z.output<typeof renewalStatuses>;
export type RenewalOption = { label: string; months: number; rent?: number | undefined };
type Renewal = {
  tenant: string;
  unit: string;
  currentRent: number;
  proposedRent: number;
  selectedOption: number;
  options: readonly RenewalOption[];
  deadline: string;
  status: Status;
  style: "offer" | "summary";
  detail?: string | null;
  counterNote?: string | undefined;
  expired?: boolean;
};

export function renewalGates(input: Record<string, unknown>) {
  const canRespond = input.style === "offer" && input.status === "sent";
  return {
    canRespond,
    canCounter: canRespond && typeof input.counterNote === "string" && Boolean(input.counterNote.trim()),
  };
}

function endOfDeadline(input: Readonly<Record<string, unknown>>) {
  const day = new Date(`${input.deadline}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.getTime();
}

export function renewalExpired(input: Readonly<Record<string, unknown>>, now: number) {
  return now >= endOfDeadline(input);
}

export function renewalExpiry(input: Readonly<Record<string, unknown>>, now: number) {
  const end = endOfDeadline(input);
  return input.status === "sent" && end > now ? end : undefined;
}

export const renewalResponse = defineLocalState({
  schema: z.strictObject({
    key: z.string().max(512),
    selectedOption: z.int().min(0).max(3),
    status: renewalStatuses,
    counterNote: z.string().max(renewalNoteMax),
  }),
  // These public terms identify the offer; replacing it cannot inherit a local response or term choice.
  initial: (input) => ({
    key: JSON.stringify([
      input.renewalRef,
      input.deadline,
      input.currentRent,
      input.proposedRent,
      (input.options as RenewalOption[]).map(({ label, months, rent }) => [label, months, rent]),
    ]),
    selectedOption: input.selectedOption as number,
    status: input.status as Status,
    counterNote: (input.counterNote as string | undefined) ?? "",
  }),
  events: ["accept.press", "counter.press", "decline.press", "note.type"],
  itemEvents: ["root.select"],
  reduce: (state, { part, value }) => {
    if (part === "root" && typeof value === "number") return { state: { ...state, selectedOption: value } };
    if (part === "note" && typeof value === "string" && value.length <= renewalNoteMax)
      return { state: { ...state, counterNote: value } };
    if (part === "accept" || part === "decline" || (part === "counter" && state.counterNote.trim())) {
      const status: Status = part === "accept" ? "accepted" : part === "decline" ? "declined" : "countered";
      return { state: { ...state, status } };
    }
    return { error: "Invalid renewal response" };
  },
  project: ({ status, selectedOption, counterNote }) => ({ status, selectedOption, counterNote }),
});

export function renewalCopy(lang?: string, currency?: AppCurrency, words = propertyWordsFor(lang).renewals) {
  const money = (value: number) => moneyLine(value, currency, undefined, lang);
  return {
    words,
    summary: (input: Renewal) => {
      const rent = input.options[input.selectedOption]?.rent ?? input.proposedRent;
      const difference = rent - input.currentRent;
      const ratio = difference / input.currentRent;
      const percent = new Intl.NumberFormat(localeOf(lang), {
        style: "percent",
        signDisplay: "exceptZero",
        maximumFractionDigits: 1,
        notation: Math.abs(ratio) >= 10 ? "scientific" : "standard",
      }).format(ratio);
      return {
        proposed: money(rent),
        current: words.current(money(input.currentRent)),
        change: difference
          ? words.change(changeLine(difference, "money", currency, lang), percent)
          : words.unchanged,
        deadline: words.deadline(appointmentDate(input.deadline, lang)),
      };
    },
    option: (row: RenewalOption, rent: number, full: boolean, selected = false) => ({
      title: selected ? words.chosen(row.label) : row.label,
      sub: full
        ? row.months === 0
          ? words.rolling
          : words.fixed(numberLine(row.months, lang), pluralForm(row.months, lang))
        : undefined,
      value: money(row.rent ?? rent),
    }),
  };
}

export function renewalReading(
  raw: unknown,
  state: StateName,
  lang?: string,
  _data?: unknown,
  currency?: AppCurrency,
) {
  const live = raw as Renewal;
  const copy = renewalCopy(lang, currency),
    { words } = copy;
  const { proposed, current, change, deadline } = copy.summary(live);
  const selected = live.options[live.selectedOption]!;
  const { canRespond, canCounter } = renewalGates(live);
  const terms =
    live.style === "summary" || state === "success"
      ? [words.selectedTerm(selected.label)]
      : [
          words.options,
          ...live.options.map((row, index) => {
            const { title, sub, value } = copy.option(
              row,
              live.proposedRent,
              live.detail !== "brief",
              index === live.selectedOption,
            );
            return words.optionReading(`r${index + 1}`, title, value, sub);
          }),
        ];
  return [
    ...(state === "success" ? [words.success] : []),
    ...(live.expired && live.status === "sent" ? [words.expired] : []),
    ...(state === "success" && live.status === "sent" ? [] : [words.statuses[live.status]]),
    deadline,
    words.proposed,
    words.proposedReading(proposed),
    current,
    change,
    ...terms,
    ...(live.style === "offer" && live.counterNote ? [live.counterNote] : []),
    ...(state === "filled" && canRespond && !live.expired
      ? [
          ...(!live.counterNote ? [words.note] : []),
          words.accept,
          ...(canCounter ? [words.counter] : []),
          words.decline,
        ]
      : []),
  ];
}

import {
  appointmentDate,
  clockLine,
  compactMoneyLine,
  durationLine,
  numberLine,
  timeOfDayLine,
  type StateName,
} from "../../../catalog";
import { requestsWordsFor, type RequestsWords } from "../lang";

type Words = RequestsWords["workOrder"];
type Blocker = Exclude<keyof Words["blockers"], "none">;
export type WorkLine = { id: string } & (
  | { kind: "task"; text: string; required: boolean; done: boolean }
  | { kind: "part"; name: string; qty: number; unitCost?: number | undefined }
);
type Part = Extract<WorkLine, { kind: "part" }>;
type Order = {
  number: string;
  request: string;
  title: string;
  who?: string | undefined;
  date?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  status: keyof Words["status"];
  blockedBy?: Blocker | undefined;
  note: string;
  detail: "full" | "brief";
  lines: readonly WorkLine[];
  minutes: number;
  elapsed?: number | undefined;
  running: boolean;
  editable: boolean;
};

function extendedCost({ qty, unitCost }: Part) {
  const amount = qty * (unitCost ?? 0);
  const cents = Math.round((amount + Number.EPSILON) * 100);
  return Number.isSafeInteger(cents) ? cents / 100 : amount;
}

function materialTotals(lines: readonly WorkLine[], w: Words, lang?: string) {
  const parts = lines.filter((line) => line.kind === "part");
  const priced = parts.filter((line) => line.unitCost !== undefined);
  if (!priced.length) return undefined;
  const sum = priced.reduce((total, part) => total + extendedCost(part), 0);
  return {
    label: parts.length === priced.length ? w.total : w.pricedTotal,
    value: Number.isFinite(sum) ? compactMoneyLine(sum, undefined, lang) : w.costUnavailable,
  };
}

export function workOrderLine(line: Part, lang?: string) {
  const w = requestsWordsFor(lang).workOrder;
  const qty = w.quantityLine(numberLine(line.qty, lang));
  const amount = extendedCost(line);
  return {
    qty,
    cost:
      line.unitCost === undefined
        ? undefined
        : Number.isFinite(amount)
          ? compactMoneyLine(amount, undefined, lang)
          : w.costUnavailable,
  };
}

export function workOrderCopy(p: Order, state: StateName, lang?: string) {
  const w = requestsWordsFor(lang).workOrder;
  const showSchedule = p.detail === "full" && state !== "success";
  const status =
    state === "success" || p.status === "done"
      ? "done"
      : p.blockedBy
        ? "blocked"
        : p.running
          ? "working"
          : p.status === "blocked"
            ? "ready"
            : p.status;
  const seconds = p.minutes * 60 + (p.elapsed ?? 0);
  return {
    number: w.number(p.number),
    request: w.request(p.request),
    who: showSchedule && p.who ? w.assignee(p.who) : undefined,
    window:
      showSchedule && p.date && p.from && p.to
        ? w.window(appointmentDate(p.date, lang), timeOfDayLine(p.from, lang), timeOfDayLine(p.to, lang))
        : undefined,
    status: w.status[status],
    statusTone:
      status === "blocked" ? ("warn" as const) : status === "done" ? ("good" as const) : ("muted" as const),
    clock: Number.isSafeInteger(Math.floor(seconds))
      ? clockLine(seconds, lang)
      : durationLine(p.minutes, lang),
    blocker: p.blockedBy ? w.blockedBy(w.blockers[p.blockedBy]) : undefined,
    total: materialTotals(p.lines, w, lang),
  };
}

function orderLines(p: Order, w: Words, lang?: string) {
  return p.lines.map((line) => {
    if (line.kind === "task")
      return [
        line.id,
        JSON.stringify(line.text),
        line.required && w.required,
        line.done ? w.checked : w.unchecked,
      ]
        .filter(Boolean)
        .join(" ");
    const { qty, cost } = workOrderLine(line, lang);
    return [line.id, JSON.stringify(line.name), qty, cost].filter(Boolean).join(" ");
  });
}

export function workOrderReading(input: unknown, state: StateName, lang?: string): string[] {
  if (state !== "filled" && state !== "success") return [];
  const p = input as Order;
  const w = requestsWordsFor(lang).workOrder;
  const copy = workOrderCopy(p, state, lang);
  if (state === "success") return [copy.number, p.title, copy.status, copy.request];
  return [
    copy.number,
    p.title,
    copy.status,
    copy.request,
    copy.who,
    copy.window,
    w.clock,
    copy.clock,
    w.checks,
    ...orderLines(p, w, lang),
    p.lines.some((line) => line.kind === "part") ? w.parts : undefined,
    p.editable && p.lines.some((line) => line.kind === "part") ? w.quantity : undefined,
    copy.total?.label,
    copy.total?.value,
    copy.blocker,
    p.note,
    ...(p.editable
      ? [p.running ? w.stop : w.start, w.blocker, ...Object.values(w.blockers), w.note, w.finish]
      : []),
  ].filter((line): line is string => Boolean(line));
}

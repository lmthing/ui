import type { Meta } from "../meta";
import { dateOrdinal, dateSpanNights, type DateSpan } from "../props";
import type { ActStep, Values } from "./act";

export type DateSpanSelection = {
  start: string;
  end: string;
  date: string;
  available?: string;
  minNights?: string;
  clear?: string;
  when?: { prop: string; equals: string | boolean };
};

export const dateSpanKey = "$dateSpan";

export function activeDateSpan(meta: Meta, props: Values) {
  const spec = meta.items && meta.dateSpan;
  return spec && (!spec.when || props[spec.when.prop] === spec.when.equals) ? spec : undefined;
}

function availableDates(meta: Meta, props: Values, spec: DateSpanSelection) {
  const rows = props[meta.items!.key];
  const seen = new Set<number>();
  const available = new Set<number>();
  if (Array.isArray(rows))
    for (const row of rows as Values[]) {
      const day = dateOrdinal(row[spec.date]);
      if (day === undefined) continue;
      if (seen.has(day) || (spec.available && row[spec.available] === false)) available.delete(day);
      else available.add(day);
      seen.add(day);
    }
  return available;
}

function validSpan(span: DateSpan, available: ReadonlySet<number>, minimum: number): DateSpan {
  const first = dateOrdinal(span.start);
  if (first === undefined || !available.has(first)) return {};
  if (dateSpanNights(span.start, span.end, available, minimum) !== undefined) return span;
  return { start: span.start! };
}

function spanInput(meta: Meta, props: Values, spec: DateSpanSelection, saved?: DateSpan) {
  const available = availableDates(meta, props, spec);
  const minimum = spec.minNights ? (props[spec.minNights] as number) : 1;
  const seed = { start: props[spec.start], end: props[spec.end] } as DateSpan;
  return { available, minimum, span: validSpan(saved ?? seed, available, minimum) };
}

export function projectDateSpan(meta: Meta, props: Values, saved: unknown): Values {
  const spec = activeDateSpan(meta, props);
  if (!spec) return props;
  const { span } = spanInput(meta, props, spec, saved as DateSpan | undefined);
  return { ...props, [spec.start]: span.start, [spec.end]: span.end };
}

/** The same choice rule backs the drawing, action offers and the staged action plan. */
export function dateSpanChoice(meta: Meta, props: Values, date: unknown): DateSpan | undefined {
  const spec = activeDateSpan(meta, props);
  if (!spec || typeof date !== "string") return;
  const { available, span, minimum } = spanInput(meta, props, spec);
  const next = dateOrdinal(date);
  if (next === undefined || !available.has(next)) return;
  if (!span.start || span.end || date < span.start) return { start: date };
  if (dateSpanNights(span.start, date, available, minimum) !== undefined)
    return { start: span.start, end: date };
}

export function dateSpanOffer(meta: Meta, props: Values, part: string, action: string, row?: Values) {
  const spec = activeDateSpan(meta, props);
  if (!spec) return true;
  if (row && part === "root" && action === "select")
    return dateSpanChoice(meta, props, row[spec.date]) !== undefined;
  if (!row && part === spec.clear && action === "press") return typeof props[spec.start] === "string";
  return true;
}

export function dateSpanItem(meta: Meta, props: Values, target: string) {
  const rows = meta.items && props[meta.items.key];
  if (!meta.dateSpan || target.includes("/") || !Array.isArray(rows)) return;
  return (rows as Values[]).find(({ id }) => id === target);
}

export function planDateSpan(meta: Meta, props: Values, step: ActStep, target: string, base: string) {
  const spec = activeDateSpan(meta, props);
  if (!spec) return;
  if (step.action === "press" && target === spec.clear)
    return { step, changes: { [`${base}/${dateSpanKey}`]: {} } };
  if (step.action !== "select") return;
  const row = dateSpanItem(meta, props, target);
  if (!row) return;
  const date = row[spec.date];
  const span = dateSpanChoice(meta, props, date);
  if (span && (step.value === undefined || step.value === date))
    return { step: { ...step, value: date }, changes: { [`${base}/${dateSpanKey}`]: span } };
  return { step, error: "Select an available date at this address" };
}

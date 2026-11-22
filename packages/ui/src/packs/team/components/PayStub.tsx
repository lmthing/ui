import { z } from "zod";
import {
  clip,
  isoDate,
  itemsOf,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";

// Core first: Amount/total shows one sum, not a dated pay statement with earnings, deductions, and year-to-date totals.
export const meta = {
  id: "PayStub",
  status: "draft",
  group: "data",
  tier: "people",
  pick: "an employee viewing their issued payslip and deductions. Not running employer small-business payroll (books Payroll), collecting daily hours (Timesheet), or personal bills (money Bills).",
  purpose:
    "An employee's self-service read-only pay statement displaying pay period dates, pay date, itemized gross earnings, itemized.",
  region: "body",
  weight: 2,
  realPath: "finalized read-only pay statements issued to the employee by a shared employer payroll host.",
  parts: ["root", "export"],
  actions: { parts: { export: ["press"] } },
  partTiers: { export: "service" },
  states: ["filled", "empty", "loading", "error"],
} as const satisfies Meta;
export const props = z.strictObject({
  periodFrom: isoDate,
  periodTo: isoDate,
  payDate: isoDate,
  employee: text(24),
  earnings: z
    .array(
      z.strictObject({
        label: text(24),
        hours: z.number().min(0).optional(),
        rate: z.number().min(0).optional(),
        amount: z.number().min(0),
      }),
    )
    .min(1)
    .max(6),
  deductions: z
    .array(z.strictObject({ label: text(24), amount: z.number().min(0) }))
    .min(0)
    .max(6),
  ytdGross: z.number().min(0).optional(),
  ytdNet: z.number().min(0).optional(),
  style: z.enum(["statement", "summary"]).default("statement"),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 1);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    periodFrom: "2000-01-01",
    periodTo: "2000-01-01",
    payDate: "2000-01-01",
    employee: castTitle(24, 0),
    earnings: Array.from({ length: 1 }, (_, index) => ({ label: castTitle(24, index), amount: 0 })),
    deductions: Array.from({ length: 0 }, (_, index) => ({ label: castTitle(24, index), amount: 0 })),
  };
}

// TODO: Replace the neutral seed with two real examples covering styles and optional fields.
export const examples = [fallback({ cast: { things: [], items: [] } })] satisfies z.input<typeof props>[];

// TODO: Replace the probe prompts and verify the fixture address and any action gates.
const { choose, write, read } = probesFor("PayStub");
export const probes = [
  choose("TODO: describe the need this component should win"),
  choose("TODO: describe the nearest wrong choice", "Payroll"),
  write("TODO: describe realistic values and intent in the person’s words"),
  read("TODO: ask for this action in the person’s words", { address: "c1/export", action: "press" }),
] satisfies Probe[];

export function PayStub(_input: Props<typeof props, typeof meta>) {
  return null;
}

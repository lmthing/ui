import { z } from "zod";
import {
  clip,
  isoDate,
  itemsOf,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";

// Core first: Progress/bars tracks amounts against targets, not PTO accrual, usage, pending requests and available balances.
export const meta = {
  id: "LeaveBalance",
  status: "draft",
  group: "data",
  tier: "people",
  pick: "viewing accrued, used, pending, and available PTO balances by leave type. Not manager decisions (Approval), generic progress bars (Progress), or weekly shift hours (Timesheet).",
  purpose:
    "Employee PTO summary broken down across leave types such as Vacation, Sick, and Personal time, showing.",
  region: "body",
  weight: 2,
  realPath: "accrued and pending PTO balances synced from a shared HR or workplace scheduling host.",
  parts: ["root", "request"],
  items: { key: "balances", parts: ["root"] },
  actions: { parts: { request: ["press"] }, items: { root: ["press"] } },
  states: ["filled", "empty", "loading"],
} as const satisfies Meta;
export const props = z.strictObject({
  employee: text(24).optional(),
  unit: z.enum(["hours", "days"]).default("hours"),
  balances: z
    .array(
      z.strictObject({
        label: text(20),
        accrued: z.number().min(0),
        used: z.number().min(0),
        pending: z.number().min(0),
        cap: z.number().gt(0).optional(),
        expiresOn: isoDate.optional(),
        goto: screenId.optional(),
      }),
    )
    .min(1)
    .max(6),
  style: z.enum(["meters", "compact"]).default("meters"),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 1);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    balances: Array.from({ length: 1 }, (_, index) => ({
      label: castTitle(20, index),
      accrued: 0,
      used: 0,
      pending: 0,
    })),
  };
}

// TODO: Replace the neutral seed with two real examples covering styles and optional fields.
export const examples = [fallback({ cast: { things: [], items: [] } })] satisfies z.input<typeof props>[];

// TODO: Replace the probe prompts and verify the fixture address and any action gates.
const { choose, write, read } = probesFor("LeaveBalance");
export const probes = [
  choose("TODO: describe the need this component should win"),
  choose("TODO: describe the nearest wrong choice", "Approval"),
  write("TODO: describe realistic values and intent in the person’s words"),
  read("TODO: ask for this action in the person’s words", { address: "c1/request", action: "press" }),
] satisfies Probe[];

export function LeaveBalance(_input: Props<typeof props, typeof meta>) {
  return null;
}

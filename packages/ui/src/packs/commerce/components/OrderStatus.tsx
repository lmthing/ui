import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Steps/default guides the current person through a process, not order progress with stage times and a seller handoff.
export const meta = {
  id: "OrderStatus",
  status: "draft",
  group: "data",
  purpose: "Follow an order through fulfillment or move it along as the seller.",
  pick: "Track fulfillment milestones on one goods order, with timestamps and a seller's next-stage action. Not a multi-step form (Steps), a map (DeliveryTracker), or an order receipt (OrderSummary).",
  writeHints: [
    "at is the zero-based current step index and must exist in the steps array. Use a real HH:MM time when known.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The seller changes the order on their device; the buyer needs a shared app to see changes live.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["line"] } },
  parts: ["root", "line", "next"],
  items: { key: "steps", parts: ["root", "label", "time"] },
  states: ["filled", "success"],
  actions: { parts: { next: ["press"] }, when: { next: { can_advance: true } } },
  read: (input) => {
    const { at, steps } = input as { at: number; steps: z.output<typeof stepProps>[] };
    return [steps[at]!.label];
  },
} as const satisfies c.Meta;

const stepProps = z.strictObject({ label: c.text(16), time: c.clock.optional() });
export const props = z
  .strictObject({
    steps: z.array(stepProps).min(3).max(5),
    at: z.int().min(0).max(4),
    line: c.text(48).optional(),
    seller: z.boolean(),
    ...c.variantProps(meta.variants),
  })
  .refine(({ steps, at }) => at < steps.length, { path: ["at"] })
  .overwrite((value) => ({
    ...value,
    ...(value.detail === "brief" ? { line: undefined } : {}),
    can_advance: value.seller && value.at < value.steps.length - 1,
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  return {
    steps: Array.from({ length: 3 }, (_, i) => {
      const item = items[i];
      return { label: (item && c.titleOf(item, 16, thing)) || c.placeholderTitle(i, lang) };
    }),
    at: 0,
    seller: false,
  };
}

export const examples = [
  {
    steps: [{ label: "Received", time: "08:45" }, { label: "Preparing", time: "09:00" }, { label: "Ready" }],
    at: 1,
    line: "Packing your fern pot now",
    seller: true,
  },
  {
    steps: [
      { label: "Received", time: "11:00" },
      { label: "On its way", time: "11:50" },
      { label: "Delivered" },
    ],
    at: 1,
    seller: false,
    detail: "brief",
    density: "compact",
    surface: "plain",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("OrderStatus");
export const probes = [
  choose(
    "Show how far one goods order has got, from received to preparing to ready, with milestone times and a seller button to move it on",
  ),
  choose("Show which step I am filling in now in my own three-step registration form", "Steps"),
  write(
    "Track a plant order: Received at 08:45, Preparing at 09:00 and current, then Ready. Let the seller advance it.",
  ),
  {
    ...write(
      "Track Received, On its way, and Delivered for one order. On its way is current; this is for the buyer. Hide the secondary status sentence and show just the track.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("As the seller, advance the order to its next stage", { address: "o1/next", action: "press" }),
] satisfies c.Probe[];

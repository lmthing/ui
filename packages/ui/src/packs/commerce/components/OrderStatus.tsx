import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { nextOrderStage, orderStatusReading } from "../copy";
import { commerceWordsFor } from "../lang";

// Core first: Steps/default guides the current person through a process, not order progress with stage times and a seller handoff.
export const meta = {
  id: "OrderStatus",
  status: "ready",
  group: "data",
  purpose: "Follow an order through fulfillment or move it along as the seller.",
  pick: "Track fulfillment milestones on one goods order, with timestamps and a seller's next-stage action. Not a multi-step form (Steps), a map (DeliveryTracker), or an order receipt (OrderSummary).",
  writeHints: [
    "at is the zero-based current step index and must exist in the steps array. Use a real HH:MM time when known.",
    'If asked to suppress an authored secondary status sentence, set detail to "brief". Omitting line alone is not the brief layout. Leave density and surface null unless requested.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The seller changes the order on their device; the buyer needs a shared app to see changes live.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["line"] } },
  parts: ["root", "track", "status", "line", "next", "next_label"],
  items: { key: "steps", parts: ["root", "label", "time"] },
  states: ["filled", "success"],
  actions: { parts: { next: ["press"] }, when: { next: { can_advance: true } } },
  readSuccess: true,
  read: (input, state, lang): string[] => {
    if (state !== "filled" && state !== "success") return [];
    return orderStatusReading(input as z.output<typeof props>, state === "success", lang);
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
    can_advance: nextOrderStage(value) !== undefined,
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
    line: "Fern pot · Shop pickup",
    seller: true,
  },
  {
    steps: [
      { label: "Received", time: "11:00" },
      { label: "Treats packed", time: "11:25" },
      { label: "On its way", time: "11:50" },
      { label: "Delivered" },
    ],
    at: 2,
    seller: false,
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
      'Track Received, On its way, and Delivered for one order. On its way is current; this is for the buyer. The optional secondary status sentence is "Almost there". Use the brief display that hides that sentence and shows just the track. Do not set spacing or surface options.',
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("As the seller, advance the order to its next stage", { address: "o1/next", action: "press" }),
] satisfies c.Probe[];

type OrderStatusProps = c.Props<typeof props, typeof meta>;

// prettier-ignore
function OrderStage({ step, current, pending, complete }: {
  step: OrderStatusProps["steps"][number]; current: boolean; pending: boolean; complete: boolean;
}) {
  const { words, lang } = kit.useWords(commerceWordsFor);
  const context = kit.usePartContext();
  const { id, label, time } = step;
  const tone = current ? (complete ? "good" : "accent") : pending ? "muted" : "text";
  return <kit.PartScope {...context} item={id}>
    <kit.KitCard style="plain" part="root" label={current && !complete ? words.currentOrderStage(label) : label}>
      <kit.KitGrid fitLast>
        <kit.KitText part="label" role={current ? "heading" : "body"} density="comfortable" {...{ tone }}>{label}</kit.KitText>
        {time !== undefined && <kit.KitText part="time" role="label" tone="muted" align="end" tabular density="comfortable">
          {c.timeOfDayLine(time, lang)}
        </kit.KitText>}
      </kit.KitGrid>
    </kit.KitCard>
  </kit.PartScope>;
}

// prettier-ignore
export function OrderStatus(input: OrderStatusProps) {
  const { at, steps, line } = input;
  const state = kit.useComponentState();
  const { words } = kit.useWords(commerceWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const complete = state === "success";
  const current = complete ? steps.length - 1 : at;
  const next = state === "filled" ? nextOrderStage(input) : undefined;

  return <kit.KitCard part="root" padded {...{ density, surface }}>
    <kit.KitContent {...{ density }}>
      {complete && <kit.KitText part="status" role="label" tone="good" {...{ density }}>{words.orderComplete}</kit.KitText>}
      <kit.KitStepsTrack style="bar" count={steps.length} at={current + 1} part="track" />
    </kit.KitContent>
    <kit.KitContent group="response" {...{ density }}>
      <kit.KitGrid list arrange="rows" listRowGap="cards" {...{ density }}>
        {steps.map((step, index) => <OrderStage key={step.id} {...{ step, complete }} current={index === current} pending={index > current} />)}
      </kit.KitGrid>
    </kit.KitContent>
    {((detail === "full" && line) || next) && <kit.KitContent group="response" {...{ density }}>
      {detail === "full" && line && <kit.KitText part="line" role="label" tone="muted" {...{ density }}>{line}</kit.KitText>}
      {next && <kit.KitContent group={detail === "full" && line ? "response" : "content"} {...{ density }}>
        <kit.KitAction part="next" action="press" kind="secondary" label={words.advanceOrder(next)} />
      </kit.KitContent>}
    </kit.KitContent>}
  </kit.KitCard>;
}

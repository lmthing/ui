import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { nextOrderStage, orderStatusReading } from "../copy";
import { commerceWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-OrderStatus.generated";

// Core first: Steps/default guides the current person through a process, not order progress with stage times and a seller handoff.
export const meta = {
  id: "OrderStatus",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The seller changes the order on their device; the buyer needs a shared app to see changes live.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["line"] } },
  // prettier-ignore
  parts: ["root", "track", "status", "line", "next", "next_label", "carrier", "tracking",
    "tracking_label", "tracking_icon", "proof", "proof_label", "pickup_code", "pickup_value", "bay", "here", "here_label"],
  items: { key: "steps", parts: ["root", "label", "time"] },
  states: ["filled", "success"],
  actions: {
    parts: { next: ["press"], tracking: ["press"], here: ["press"] },
    when: { next: { can_advance: true }, tracking: { can_copy: true }, here: { can_arrive: true } },
  },
  readSuccess: true,
  successActions: ["tracking.press"],
  read: (input, state, lang): string[] => {
    if (state !== "filled" && state !== "success") return [];
    return orderStatusReading(input as z.output<typeof props>, state === "success", lang);
  },
} as const satisfies c.Meta;

const stepProps = z.strictObject({ label: c.text(16), time: c.clock.optional() });
// prettier-ignore
export const props = z
  .strictObject({
    steps: z.array(stepProps).min(3).max(5),
    at: z.int().min(0).max(4),
    line: c.text(48).optional(),
    seller: z.boolean(),
    style: z.enum(["carrier", "pickup"]).optional(),
    carrier: c.text(24).optional(), trackingNumber: c.text(24).optional(), proofPhoto: c.photo.optional(),
    pickupCode: c.text(16).optional(), bay: c.text(24).optional(),
    ...c.variantProps(meta.variants),
  })
  .refine(({ steps, at }) => at < steps.length, { path: ["at"] })
  .refine((p) => p.style === "carrier" || !(p.carrier || p.trackingNumber || p.proofPhoto), { path: ["style"] })
  .refine((p) => p.style === "pickup" || !(p.pickupCode || p.bay), { path: ["style"] })
  .overwrite((value) => ({
    ...value,
    ...(value.detail === "brief" ? { line: undefined } : {}),
    can_advance: nextOrderStage(value) !== undefined,
    can_copy: value.trackingNumber !== undefined,
    can_arrive: value.style === "pickup" && !value.seller,
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

// prettier-ignore
export const examples = [
  {
    steps: [{ label: "Received", time: "08:45" }, { label: "Preparing", time: "09:00" }, { label: "Ready" }],
    at: 1, line: "Fern pot · Shop pickup", seller: true,
  },
  {
    steps: [
      { label: "Received", time: "11:00" },
      { label: "Treats packed", time: "11:25" },
      { label: "On its way", time: "11:50" },
      { label: "Delivered", time: "12:15" },
    ],
    at: 3, seller: false, style: "carrier", carrier: "Parcel Post", trackingNumber: "PP450981", proofPhoto: "local:1",
  },
  {
    style: "pickup", pickupCode: "FERN42", bay: "Locker 12", at: 2, seller: false,
    steps: [{ label: "Received", time: "08:45" }, { label: "Packed", time: "09:00" }, { label: "Ready", time: "10:15" }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("OrderStatus");
// prettier-ignore
export const probes = [
  choose("Show how far one goods order has got, from received to preparing to ready, with milestone times and a seller button to move it on"),
  choose("Show which step I am filling in now in my own three-step registration form", "Steps"),
  write("Track a plant order: Received at 08:45, Preparing at 09:00 and current, then Ready. Let the seller advance it."),
  {
    ...write('Track Received, On its way, and Delivered for one order. On its way is current; this is for the buyer. The optional secondary status sentence is "Almost there". Use the brief display that hides that sentence and shows just the track. Do not set spacing or surface options.'),
    variant: { axis: "detail", value: "brief" },
  },
  {
    ...write("Track a Parcel Post shipment. Received at 08:45, out for delivery at 09:00 and current, then delivered. Use PP450981 as the copyable tracking number and local:1 as the delivery proof photo. This is for the buyer."),
    expectProps: { style: "carrier", carrier: "Parcel Post", trackingNumber: "PP450981", proofPhoto: "local:1" },
  },
  {
    ...write("Show a buyer's order for pickup at Locker 12 with a scannable pickup code FERN42 and an I'm here button. Show Received, Packed, then Ready as current."),
    expectProps: { style: "pickup", bay: "Locker 12", pickupCode: "FERN42", seller: false },
  },
  read("As the seller, advance the order to its next stage", { address: "o1/next", action: "press" }),
  read('Press "Copy tracking number PP450981". Use the full button part address from its action bracket, not the order address.', { address: "o1/tracking", action: "press" }, 1),
  read("Tell the shop I am here for pickup", { address: "o1/here", action: "press" }, 2),
] satisfies c.Probe[];

type OrderStatusProps = c.Props<typeof props, typeof meta>;

// prettier-ignore
function FulfillmentDetails({ input, complete }: { input: OrderStatusProps; complete: boolean }) {
  const { words: { tracking } } = kit.useWords(commerceWordsFor);
  const { carrier, trackingNumber, proofPhoto, bay, pickupCode } = input;
  if (input.style === "carrier") return <>
    {carrier && <kit.KitText part="carrier" role="label" tone="muted">{carrier}</kit.KitText>}
    {trackingNumber && <kit.KitRow part="tracking" role="button" inline label={tracking.copy(trackingNumber)}
      leading={<kit.KitIcon name="clipboard" part="tracking_icon" tone="accent" scale="sm" />}>
      <kit.KitText part="tracking_label" role="label" tone="accent">{tracking.copy(trackingNumber)}</kit.KitText></kit.KitRow>}
    {proofPhoto && <kit.KitGrid fitLast><kit.KitText part="proof_label" role="label" tone="muted">{tracking.proof}</kit.KitText>
      <kit.KitPhoto part="proof" photo={proofPhoto} shape="thumb" label={tracking.proof} /></kit.KitGrid>}
  </>;
  if (input.style !== "pickup") return null;
  return <>
    {(bay || pickupCode) && <kit.KitContent align="center">
      {bay && <kit.KitText part="bay" role="label" tone="muted">{bay}</kit.KitText>}
      {pickupCode && <kit.KitCode part="pickup_code" value={pickupCode} label={tracking.pickup(pickupCode)} used={complete} />}
      {pickupCode && !complete && <kit.KitText part="pickup_value" role="label" align="center" tabular>{tracking.pickup(pickupCode)}</kit.KitText>}
    </kit.KitContent>}
    {!complete && !input.seller && <kit.KitContent group="response"><kit.KitAction part="here" action="press" kind="secondary" label={tracking.here} full /></kit.KitContent>}
  </>;
}

// prettier-ignore
function OrderStage({ step, current, pending, complete }: {
  step: OrderStatusProps["steps"][number]; current: boolean; pending: boolean; complete: boolean;
}) {
  const { words, lang } = kit.useWords(commerceWordsFor);
  const context = kit.usePartContext();
  const { id, label, time } = step;
  const tone = current && !complete ? "accent" : pending ? "muted" : "text";
  return <kit.PartScope {...context} item={id}>
    <kit.KitCard style="plain" part="root" label={current && !complete ? words.currentOrderStage(label) : label}>
      <kit.KitGrid fitLast>
        <kit.KitText part="label" role={current && !complete ? "heading" : "body"} density="comfortable" {...{ tone }}>{label}</kit.KitText>
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
  const density = kit.useKit().density;
  const surface = "card";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const complete = state === "success";
  const current = complete ? steps.length - 1 : at;
  const next = state === "filled" ? nextOrderStage(input) : undefined;

  return <kit.KitCard part="root" padded {...{ density, surface }}>
    <kit.KitContent {...{ density }}>
      {complete && <kit.KitText part="status" role="heading" tone="good" {...{ density }}>{words.orderComplete}</kit.KitText>}
      <kit.KitStepsTrack style="dots" count={steps.length} at={current + 1} part="track" />
    </kit.KitContent>
    <kit.KitContent group="response" {...{ density }}>
      <kit.KitGrid list arrange="rows" listRowGap="cards" {...{ density }}>
        {steps.map((step, index) => <OrderStage key={step.id} {...{ step, complete }} current={index === current} pending={index > current} />)}
      </kit.KitGrid>
    </kit.KitContent>
    {(input.carrier || input.trackingNumber || input.proofPhoto || input.bay || input.pickupCode || (input.style === "pickup" && !complete && !input.seller)) &&
      <kit.KitContent group="response" {...{ density }}><FulfillmentDetails {...{ input, complete }} /></kit.KitContent>}
    {((detail === "full" && line) || next) && <kit.KitContent group="response" {...{ density }}>
      {detail === "full" && line && <kit.KitText part="line" role="label" tone="muted" {...{ density }}>{line}</kit.KitText>}
      {next && <kit.KitContent group={detail === "full" && line ? "response" : "content"} {...{ density }}>
        <kit.KitAction part="next" action="press" kind="secondary" label={words.advanceOrder(next)} />
      </kit.KitContent>}
    </kit.KitContent>}
  </kit.KitCard>;
}

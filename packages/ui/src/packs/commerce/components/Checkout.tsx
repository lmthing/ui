import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { checkoutAmount, checkoutChoices, checkoutReading } from "../copy";
import { commerceWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Checkout.generated";

const modes = ["pickup", "delivery", "table"] as const;
const methods = ["card", "cash", "wallet"] as const;

// Core first: Field/choice can set one preference, not fulfillment and payment together before placing an order.
export const meta = {
  id: "Checkout",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  selections: {
    mode: { prop: "mode", choices: { prop: "modeChoices" } },
    method: { prop: "method", choices: { prop: "methodChoices" } },
  },
  partTiersBy: { place: { prop: "method", tiers: { card: "service", wallet: "service" } } },
  realPath: "Cash on pickup works on the device; card and wallet payments need a payment service.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["time"] } },
  parts: ["root", "mode", "method", "time", "address", "total", "place", "place_label", "success"],
  states: ["filled", "success"],
  actions: {
    parts: { mode: ["select"], method: ["select"], address: ["press"], place: ["press"] },
    when: { address: { mode: "delivery" } },
  },
  deviceData: ["basket"],
  previewDeviceData: () => ({ basket: [{ total: 24.5 }] }),
  readSuccess: true,
  read: (input, state, lang, data): string[] =>
    checkoutReading(input as z.output<typeof props>, state, data?.basket, lang),
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    modes: z.array(z.enum(modes)).min(1).max(modes.length),
    mode: z.enum(modes),
    time: c.text(20).optional(),
    address: c.text(60).optional(),
    methods: z.array(z.enum(methods)).min(1).max(methods.length),
    method: z.enum(methods),
    ...c.variantProps(meta.variants),
  })
  .refine((p) => new Set(p.modes).size === p.modes.length && p.modes.includes(p.mode), { path: ["modes"] })
  .refine((p) => new Set(p.methods).size === p.methods.length && p.methods.includes(p.method), {
    path: ["methods"],
  })
  .overwrite(({ address, ...input }) => ({
    ...input,
    ...checkoutChoices(input),
    ...(input.mode === "delivery" && address ? { address } : {}),
    ...(input.detail === "brief" ? { time: undefined } : {}),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const item = c.itemsOf(cast, 1)[0];
  const address = item && c.detailOf(item, 60, thing);
  return {
    modes: ["pickup", "delivery"],
    mode: "pickup",
    methods: ["cash", "card"],
    method: "cash",
    address: address ?? c.wordsFor(lang).placeholderDetail,
  };
}

export const examples = [
  {
    modes: ["pickup", "delivery", "table"],
    mode: "delivery",
    time: "Tomorrow at 10:30",
    address: "21 Fern Lane",
    methods: ["card", "cash", "wallet"],
    method: "card",
  },
  {
    modes: ["pickup", "table"],
    mode: "pickup",
    time: "Today at 16:00",
    methods: ["cash", "wallet"],
    method: "cash",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Checkout");
export const probes = [
  choose(
    "Finish my purchase: choose pickup or delivery, pick how to pay and place the order with the basket total",
  ),
  choose("Enter or edit one labelled street address in a single line on a form, no other fields", "Field"),
  write(
    "Finish an order with pickup or delivery, pickup selected tomorrow at 10:30, card or cash, cash selected.",
  ),
  {
    ...write(
      "Finish a delivery order to 21 Fern Lane. Offer pickup and delivery, with delivery selected, and card or cash with card selected. Store the time as Tomorrow 10:30, but hide the time on this checkout. Keep the address and order total visible.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Place the order now using the selected payment method", { address: "c1/place", action: "press" }),
] satisfies c.Probe[];

type CheckoutProps = c.Props<typeof props, typeof meta>;
type ChoiceKey = "mode" | "method";

// prettier-ignore
function CheckoutChoices<T extends string>({ part, label, options, selected, density }: {
  part: ChoiceKey;
  label: string;
  options: readonly { value: T; label: string }[];
  selected: T;
  density: c.ThemeDensity;
}) {
  return <kit.KitContent {...{ density }} rhythm="flush" group={part === "method" ? "response" : "content"}>
    <kit.KitText role="label" tone="muted" part={null}>{label}</kit.KitText>
    <kit.KitTrack look="segments" role="radiogroup" {...{ part, label }}>
      {options.map(({ value, label }) => <kit.KitChip key={value} item={null} role="radio" look="segment"
        {...{ value, label }} on={selected === value} />)}
    </kit.KitTrack>
  </kit.KitContent>;
}

// prettier-ignore
function CheckoutDetails({ mode, time, address, density, success }: Pick<CheckoutProps, "mode" | "time" | "address"> & {
  density: c.ThemeDensity;
  success: boolean;
}) {
  const { words: { checkout: words } } = kit.useWords(commerceWordsFor);
  const addressLabel = address ? words.address : words.addAddress;
  return <>
    {time && <kit.KitContent {...{ density }} group="response" rhythm="flush">
      <kit.KitText role="label" tone="muted" part={null}>{words.time}</kit.KitText>
      <kit.KitText part="time" {...{ density }}>{time}</kit.KitText>
    </kit.KitContent>}
    {mode === "delivery" && (!success || address) &&
      <kit.KitContent {...{ density }} group="response"><kit.KitRow inline fitContent part="address" label={addressLabel} {...{ density }}
        role={success ? "text" : "button"}
        trailing={!success && <kit.KitIcon name="chevron_right" decorative scale="sm" />}>
        <kit.KitContent {...{ density }} rhythm="flush">
          <kit.KitText role="label" tone={address ? "muted" : "accent"} part={null}>{addressLabel}</kit.KitText>
          {address && <kit.KitText part={null} {...{ density }}>{address}</kit.KitText>}
        </kit.KitContent>
      </kit.KitRow></kit.KitContent>}
  </>;
}

// prettier-ignore
export function Checkout(input: CheckoutProps) {
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const success = kit.useComponentState() === "success";
  const { basket } = kit.useDeviceData();
  const { lang, words: { checkout: words } } = kit.useWords(commerceWordsFor);
  const { modeChoices, methodChoices } = checkoutChoices(input, lang);
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    {success ? <kit.KitText role="heading" part="success">{words.success}</kit.KitText> :
      <CheckoutChoices part="mode" label={words.fulfillment} options={modeChoices}
        selected={input.mode} {...{ density }} />}
    <CheckoutDetails {...input} {...{ density, success }} />
    {!success && <CheckoutChoices part="method" label={words.payment} options={methodChoices}
      selected={input.method} {...{ density }} />}
    <kit.KitContent group="response" rhythm="flush" {...{ density }}>
      <kit.KitText role="label" tone="muted" part={null}>{words.total}</kit.KitText>
      <kit.KitText role="number" numberScale="compact" part="total" tabular {...{ density }}
        {...(success ? { tone: "muted", emphasis: "quiet" } : {})}>
        {checkoutAmount(basket, lang)}
      </kit.KitText>
    </kit.KitContent>
    {!success && <kit.KitAction part="place" action="press" label={words.place} full />}
  </kit.KitCard>;
}

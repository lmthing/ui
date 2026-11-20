import { z } from "zod";
import {
  probesFor,
  clip,
  icon,
  itemVariantProps,
  itemsOf,
  placeholderTitle,
  placeholderValue,
  text,
  thingOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
  type ThemeDensity,
} from "../catalog";
import * as kit from "../kit";

export const meta = {
  id: "KeyValue",
  group: "content",
  purpose: "Label and value details of one single thing, like its room or schedule.",
  pick: "Any need about one thing's details or settings. Not several separate things (List) or summary numbers (Stats).",
  writeHints: [
    'A request for a two-column grid sets arrange to "grid" only. Otherwise leave arrange null for rows. Density, surface and lead must each be null unless their specific treatment was requested.',
    'For ordinary facts, set both tone and mark to null on every pair, never "neutral" or "none". Use those axes only if a specific fact needs visual status or highlighting by request. Set lead to "none" only when specifically asked to hide icons.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Fields of one record in the on-device database.",
  variants: {
    arrange: ["rows", "grid"],
    density: ["comfortable", "compact"],
    surface: ["card", "plain", "outlined"],
    lead: ["icon", "none"],
  },
  items: {
    key: "pairs",
    parts: ["root", "label", "value", "icon"],
    variants: { tone: ["neutral", "good", "warn", "bad"], mark: ["none", "highlight", "muted"] },
  },
  variantParts: { "lead.none": { hides: ["icon"] } },
  states: ["filled", "empty", "loading"],
} as const satisfies Meta;

const pairProps = z.strictObject({
  label: text(20),
  value: text(28),
  icon: icon.optional(),
  ...itemVariantProps(meta.items.variants),
});
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    pairs: z.array(pairProps).min(1).max(6),
  })
  .overwrite((value) =>
    value.lead === "none"
      ? { ...value, pairs: value.pairs.map((pair) => ({ ...pair, icon: undefined })) }
      : value,
  );

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const item = itemsOf(cast, 1)[0];
  const pairs = (thing?.fields ?? [])
    .flatMap((field) => {
      const value = item?.[field];
      const readable = field
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .trim();
      const label = clip(readable.charAt(0).toUpperCase() + readable.slice(1), 20);
      return label && typeof value === "string" && value.trim()
        ? [{ label, value: clip(value.trim(), 28) }]
        : [];
    })
    .slice(0, 4);
  return {
    pairs: pairs.length
      ? pairs
      : [0, 1].map((index) => ({ label: placeholderTitle(index, lang), value: placeholderValue })),
  };
}

const facts = [
  { label: "Room", value: "Bathroom", icon: "home" },
  { label: "Bright light", value: "Indirect", icon: "sun" },
  { label: "Water (days)", value: "7", icon: "drop" },
  { label: "Last watered", value: "Mon, 16 Nov", icon: "calendar" },
] as const;
export const examples = [
  { pairs: [...facts] },
  {
    arrange: "grid",
    pairs: [
      { label: "Breed", value: "Labrador", icon: "dog" },
      { label: "Walks a week", value: "5" },
      { label: "Owner", value: "Alex", icon: "user" },
      { label: "Notes", value: "Quiet parks" },
    ],
  },
  { density: "compact", pairs: [...facts] },
  { surface: "plain", pairs: [...facts] },
  { surface: "outlined", pairs: [...facts] },
  { lead: "none", pairs: [...facts] },
  { pairs: [{ ...facts[0], label: "Plant health", value: "Healthy", tone: "good" }, ...facts.slice(1)] },
  { pairs: [{ ...facts[0], label: "Soil moisture", value: "Dry", tone: "warn" }, ...facts.slice(1)] },
  { pairs: [{ ...facts[0], label: "Drainage", value: "Blocked", tone: "bad" }, ...facts.slice(1)] },
  { pairs: [facts[0], facts[1], { ...facts[2], mark: "highlight" }, facts[3]] },
  { pairs: [facts[0], facts[1], facts[2], { ...facts[3], mark: "muted" }] },
] satisfies z.input<typeof props>[];

const { choose, write } = probesFor("KeyValue");
export const probes = [
  choose("the facts about one plant: room, light, water interval"),
  choose("show all my plants to pick one", "List"),
  write("One plant in the bathroom, bright indirect light, watered every seven days"),
  {
    ...write(
      "For one plant, put four label-and-value facts in a two-column grid: Room is Bathroom, Light is Indirect, Water is Weekly and Pot is Ceramic.",
    ),
    variant: { axis: "arrange", value: "grid" },
  },
] satisfies Probe[];

type Pair = Props<typeof props, typeof meta>["pairs"][number];

function PairRow({ pair, horizontal, density }: { pair: Pair; horizontal: boolean; density: ThemeDensity }) {
  const label = (
    <kit.KitText role="caption" tone="muted" part="label" density={density}>
      {pair.label}
    </kit.KitText>
  );
  const number = /^\d+(?:\s+\p{L}+)?$/u.test(pair.value) && pair.value.length <= 6;
  const value = (
    <kit.KitText role={number ? "number" : "body"} part="value" density={density}>
      {pair.value}
    </kit.KitText>
  );
  return (
    <kit.KitRow
      item={pair.id}
      label={pair.label}
      tone={pair.tone}
      mark={pair.mark}
      density={density}
      leading={pair.icon ? <kit.KitIcon name={pair.icon} tone="muted" part="icon" /> : undefined}
    >
      <kit.KitGrid arrange={horizontal ? "grid" : "rows"} density={density}>
        {label}
        {value}
      </kit.KitGrid>
    </kit.KitRow>
  );
}

// prettier-ignore
export function KeyValue({ arrange, pairs, surface, density: requestedDensity }: Props<typeof props, typeof meta>) {
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, requestedDensity);
  const grid = arrange === "grid";
  const rows = grid || state !== "loading";
  const drawPairs = () => pairs.map((pair) => state === "loading"
    ? <kit.KitSkeleton key={pair.id} rows={1} shape="pairs" density={density} lead={pair.icon ? "dot" : "none"} />
    : <PairRow key={pair.id} pair={pair} horizontal={!grid} density={density} />);
  return (
    <kit.KitCard surface={surface} density={density} part="root">
      {state === "empty" ? <kit.KitEmpty part="label" /> : rows
        ? <kit.KitGrid arrange={arrange} density={density}>{drawPairs()}</kit.KitGrid>
        : <kit.KitSkeleton rows={pairs.length} shape="pairs" density={density} />}
    </kit.KitCard>
  );
}

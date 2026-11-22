import { z } from "zod";
// prettier-ignore
import { probesFor, clip, icon, itemVariantProps, itemsOf, placeholderTitle,
  placeholderValue, secretRevealKey, secretRevealMatches, text, thingOf, variantProps, type FallbackInput, type Meta, type Probe,
  type Props, type ThemeDensity,
} from "../catalog";
import * as kit from "../kit";
import { prompt } from "../entry/prompt-KeyValue.generated";

export const meta = {
  id: "KeyValue",
  status: "ready",
  group: "content",
  ...prompt,
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
    parts: ["root", "label", "value", "icon", "reveal", "reveal_icon", "copy", "copy_icon"],
    readSecrets: { fields: ["value"], when: { masked: true } },
    revealSecrets: { part: "reveal", fields: ["label", "value"] },
    variants: { tone: ["neutral", "good", "warn", "bad"], mark: ["none", "highlight", "muted"] },
  },
  variantParts: { "lead.none": { hides: ["icon"] } },
  states: ["filled", "empty", "loading"],
  actions: {
    items: { reveal: ["toggle"], copy: ["copy"] },
    when: { reveal: { masked: true }, copy: { masked: true } },
  },
  partTiers: { reveal: "ok", copy: "ok" },
  confirmParts: ["copy"],
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
    masked: z.boolean().optional(),
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
  { pairs: [{ label: "Plant health", value: "Healthy", icon: "heart", tone: "good" }, ...facts.slice(1)] },
  { pairs: [{ label: "Soil moisture", value: "Dry", icon: "drop", tone: "warn" }, ...facts.slice(1)] },
  { pairs: [{ label: "Drainage", value: "Blocked", icon: "filter", tone: "bad" }, ...facts.slice(1)] },
  { pairs: [facts[0], facts[1], { ...facts[2], mark: "highlight" }, facts[3]] },
  { pairs: [facts[0], facts[1], facts[2], { ...facts[3], mark: "muted" }] },
  { masked: true, pairs: [{ label: "Walk entry code", value: "DEMO-042" }] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("KeyValue");
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
  {
    ...write("Hide the dog walk's entry code until revealed. Use the fake code DEMO-042."),
    expectProps: { masked: true },
  },
  read("Show the hidden walk entry code", { address: "k1/r1/reveal", action: "toggle" }, 11),
] satisfies Probe[];

type Pair = Props<typeof props, typeof meta>["pairs"][number];

const valueRole = (value: string) =>
  /^\d+(?:\s+\p{L}+)?$/u.test(value) && value.length <= 6 ? "number" : "body";

// prettier-ignore
function MaskedValue({ pair, loading, density }: { pair: Pair; loading: boolean; density: ThemeDensity }) {
  const { screen, component } = kit.usePartContext();
  const { words: { secretValue: copy } } = kit.useWords();
  const grant = kit.useControlValue<unknown>(secretRevealKey(`${screen}/${component}/${pair.id}/reveal`), undefined);
  const shown = secretRevealMatches(grant, [pair.label, pair.value]);
  const value = shown && !loading ? pair.value : copy.mask;
  if (loading) return <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["body", value]]} />;
  const reveal = <kit.KitAction part="reveal" action="toggle" icon={shown ? "lock" : "eye"} kind="quiet"
    a11y={shown ? copy.hide(pair.label) : copy.reveal(pair.label)} />;
  return <kit.KitGrid fitLast density={density}>
    <kit.KitText part="value">{value}</kit.KitText>
    <kit.KitContent lead={reveal} leadingAlign="row" density={density}>
      <kit.KitAction part="copy" action="copy" icon="clipboard" value={pair.value} kind="quiet"
        a11y={copy.copy(pair.label)} copiedLabel={copy.copied} />
    </kit.KitContent>
  </kit.KitGrid>;
}

// prettier-ignore
function PairRow({ pair, horizontal, density, loading, masked }: {
  pair: Pair; horizontal: boolean; density: ThemeDensity; loading: boolean; masked: boolean;
}) {
  const lead = pair.icon && <kit.KitIcon name={pair.icon} tone="muted" part="icon" decorative={loading} />;
  const role = valueRole(pair.value);
  return (
    <kit.KitRow
      {...(loading ? { part: null } : { item: pair.id })}
      label={pair.label}
      {...(!loading && { tone: pair.tone, mark: pair.mark })}
      inline={!horizontal}
      density={density}
      leading={lead}
    >
      <kit.KitGrid arrange={horizontal && !masked ? "grid" : "rows"} density={density}>
        {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["caption", pair.label]]} />
          : <kit.KitText role="caption" tone="muted" part="label" density={density}>{pair.label}</kit.KitText>}
        {masked ? <MaskedValue pair={pair} loading={loading} density={density} />
          : loading ? <kit.KitSkeleton shape="figure" inset="none" density="comfortable" content={[[role, pair.value]]} />
          : <kit.KitText role={role} part="value" density="comfortable">{pair.value}</kit.KitText>}
      </kit.KitGrid>
    </kit.KitRow>
  );
}

// prettier-ignore
export function KeyValue({ arrange, pairs, surface, masked = false, density: requestedDensity }: Props<typeof props, typeof meta>) {
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, requestedDensity);
  const grid = arrange === "grid";
  const spacing = grid ? "compact" : density;
  return (
    <kit.KitCard surface={surface} density={density} part="root" padded={grid && state !== "empty"}>
      {state === "empty" ? <kit.KitEmpty part="label" />
        : <kit.KitGrid arrange={arrange} density={spacing}>{pairs.map((pair) =>
          <PairRow key={pair.id} pair={pair} horizontal={!grid} density={spacing} loading={state === "loading"} masked={masked} />
        )}</kit.KitGrid>}
    </kit.KitCard>
  );
}

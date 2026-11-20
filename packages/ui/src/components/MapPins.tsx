import { z } from "zod";
import {
  probesFor,
  itemVariantProps,
  itemsOf,
  placeholderTitle,
  screenId,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import {
  KitCard,
  KitIcon,
  KitMapTile,
  KitRow,
  KitSkeleton,
  KitText,
  useComponentState,
  useVariant,
} from "../kit";

export const meta = {
  id: "MapPins",
  group: "data",
  purpose: "See where nearby places are and open a place.",
  pick: "Places positioned on a map, with matching numbered labels and optional links. Not places visited in travel order (Route) or things to browse without their locations on a map (List).",
  writeHints: [
    'Use null for unrequested MapPins and pin axes. If asked to hide the arrows on linked rows, use trail "none"; keep the links in goto. Pin tone and mark affect only the matching rows below the map.',
  ],
  region: "body",
  weight: 3,
  tier: "service",
  realPath: "A map service locates the chosen places and supplies their map positions.",
  variants: { density: ["comfortable", "compact"], trail: ["chevron", "none"] },
  items: {
    key: "pins",
    parts: ["root", "label"],
    variants: { tone: ["neutral", "good", "warn", "bad"], mark: ["none", "highlight", "muted", "new"] },
  },
  // The arrows are decorative, not addressed; hiding them must not remove the links.
  variantParts: { "trail.none": {} },
  parts: ["root", "map"],
  states: ["filled", "loading"],
  actions: { items: { root: ["press"] } },
  read: (value): string[] => {
    const { pins } = value as { pins: { id: string; label: string }[] };
    return pins.map((pin, index) => `${pin.id}: ${index + 1} ${pin.label}`);
  },
} as const satisfies Meta;

export const props = z.strictObject({
  ...variantProps(meta.variants),
  pins: z
    .array(
      z.strictObject({
        label: text(24),
        goto: screenId.optional(),
        ...itemVariantProps(meta.items.variants),
      }),
    )
    .min(1)
    .max(5)
    // Only linked pins expose the row's root action through the shared reader.
    .transform((pins) => pins.map((pin) => ({ ...pin, root: pin.goto }))),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const pins = itemsOf(cast, 3).flatMap((item) => {
    const label = titleOf(item, 24, thing);
    return label ? [{ label }] : [];
  });
  return { pins: pins.length ? pins : [0, 1, 2].map((index) => ({ label: placeholderTitle(index, lang) })) };
}

const shops = [
  { label: "Greenhouse plant shop", goto: "greenhouse" },
  { label: "Riverside nursery", goto: "riverside" },
  { label: "Garden centre" },
];
const [gate, ...stops] = [
  { label: "Park gate", goto: "park_gate" },
  { label: "Riverside pick-up", goto: "river_pickup" },
  { label: "Clover's front door" },
  { label: "Pond entrance", goto: "pond" },
  { label: "Hilltop pick-up" },
] as const;
export const examples = [
  { pins: shops },
  { pins: [gate, ...stops] },
  { trail: "none", pins: [gate, ...stops] },
  { density: "compact", pins: shops },
  ...(["good", "warn", "bad"] as const).map((tone) => ({ pins: [{ ...gate, tone }, ...stops] })),
  ...(["highlight", "muted", "new"] as const).map((mark) => ({ pins: [{ ...gate, mark }, ...stops] })),
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("MapPins");
export const probes = [
  choose(
    "Show where the dog pick-up points are around the neighbourhood, each marked with a number and a matching name below",
  ),
  choose(
    "Show the places on our walk in the order we visit: Home, Park gate, Pond, then Home again",
    "Route",
  ),
  write("Show nearby plant shops: Greenhouse plant shop, Riverside nursery and Garden centre"),
  {
    ...write(
      "Pin Park gate and Pond on the map. Keep their rows linked to park_gate and pond, but hide the chevron arrows at the end of the rows.",
    ),
    variant: { axis: "trail", value: "none" },
  },
  read("Open the park gate", { address: "m1/r1", action: "press" }, 1),
] satisfies Probe[];

export function MapPins(input: Props<typeof props, typeof meta>) {
  const { pins, trail } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const state = useComponentState();
  const inset = pins.some((pin) => pin.mark !== "none") ? "md" : "none";
  return (
    <KitCard style="inset" part="root" padded density={density}>
      <KitMapTile count={pins.length} part="map" />
      {state === "loading" ? (
        <KitSkeleton
          rows={pins.length}
          items={pins.map(({ label }) => ({ title: label }))}
          shape="rows"
          lead="dot"
          inset={inset}
          density={density}
        />
      ) : (
        pins.map((pin, index) => (
          <KitRow
            key={pin.id}
            item={pin.id}
            label={pin.label}
            goto={pin.goto}
            mark={pin.mark}
            density={density}
            inset={inset}
            lineRole="body"
            leadingAlign="line"
            trailing={
              pin.goto && trail === "chevron" ? <KitIcon name="chevron_right" decorative /> : undefined
            }
            leading={
              <KitText
                role="number"
                numberScale="compact"
                tone={pin.tone === "neutral" ? "text" : pin.tone}
                tabular
                part={null}
              >
                {index + 1}
              </KitText>
            }
          >
            <KitText
              role="body"
              part="label"
              density={density}
              tone={pin.tone === "neutral" ? "text" : pin.tone}
            >
              {pin.label}
            </KitText>
          </KitRow>
        ))
      )}
    </KitCard>
  );
}

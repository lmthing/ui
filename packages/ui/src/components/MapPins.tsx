import { z } from "zod";
import {
  probesFor,
  itemVariantProps,
  itemsOf,
  numberLine,
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
import * as kit from "../kit";
import { prompt } from "../entry/prompt-MapPins.generated";

export const meta = {
  id: "MapPins",
  status: "ready",
  group: "data",
  ...prompt,
  region: "body",
  weight: 3,
  tier: "service",
  partTiersBy: { map: { prop: "userLocation", tiers: { true: "ok" } } },
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

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    userLocation: z.boolean().optional(),
    selected: z.int().min(0).max(4).optional(),
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
  })
  .refine(({ pins, selected }) => selected === undefined || selected < pins.length, { path: ["selected"] });

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
  { pins: [gate, ...stops], userLocation: true, selected: 2 },
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
  {
    ...write("Put Park gate and Pond on a map and include my current location."),
    expectProps: { userLocation: true },
  },
  {
    ...write("Pin Park gate first and Pond second on a map. Highlight Pond, the second pin."),
    expectProps: { selected: 1 },
  },
] satisfies Probe[];

// prettier-ignore
const points = [[0.16, 0.1], [0.63, 0.1], [0.43, 0.9], [0.83, 0.9], [0.11, 0.9]] as const;
type MapProps = Props<typeof props, typeof meta>;
// prettier-ignore
function PinMap({ pins, userLocation, selected }: Pick<MapProps, "pins" | "userLocation" | "selected">) {
  const { words, lang } = kit.useWords();
  if (!userLocation && selected === undefined) return <kit.KitMapTile count={pins.length} />;
  const markers = pins.map(({ id }, index) => {
    const [x, y] = points[index]!;
    return { id, x, y, mark: "price" as const, label: numberLine(index + 1, lang), selected: selected === index };
  });
  const location = { id: "r6", x: 0.56, y: 0.47, label: words.userLocationLabel, mark: "avatar" } as const;
  return <kit.KitMapTile pins={userLocation ? [...markers, location] : markers} />;
}

// prettier-ignore
export function MapPins(input: Props<typeof props, typeof meta>) {
  const { pins, trail, selected } = input;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const state = kit.useComponentState();
  const inset = selected !== undefined || pins.some((pin) => pin.mark !== "none") ? "md" : "none";
  return (
    <kit.KitCard style="inset" part="root" padded density={density}>
      <PinMap {...input} />
      {state === "loading" ? (
        <kit.KitSkeleton
          rows={pins.length}
          items={pins.map(({ label }) => ({ title: label }))}
          shape="rows"
          lead="dot"
          inset={inset}
          density={density}
        />
      ) : (
        pins.map((pin, index) => (
          <kit.KitRow key={pin.id} item={pin.id} label={pin.label} goto={pin.goto}
            mark={pin.mark} selected={selected === index} density={density} inset={inset}
            lineRole="body" leadingAlign="line"
            trailing={pin.goto && trail === "chevron" ? <kit.KitIcon name="chevron_right" decorative /> : undefined}
            leading={<kit.KitText role="number" numberScale="compact" tone={pin.tone === "neutral" ? "text" : pin.tone}
              tabular part={null}>{index + 1}</kit.KitText>}>
            <kit.KitText
              role="body"
              part="label"
              density={density}
              tone={pin.tone === "neutral" ? "text" : pin.tone}
            >
              {pin.label}
            </kit.KitText>
          </kit.KitRow>
        ))
      )}
    </kit.KitCard>
  );
}

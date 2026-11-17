import { z } from "zod";
import {
  itemsOf,
  placeholderTitle,
  screenId,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitCard, KitContent, KitMapTile, KitRow, KitSkeleton, KitText, useComponentState } from "../kit";

export const meta = {
  id: "MapPins",
  group: "data",
  purpose: "See where nearby places are and open a place.",
  pick: "Places positioned on a map, with matching numbered labels and optional links. Not places visited in travel order (Route) or things to browse without their locations on a map (List).",
  region: "body",
  weight: 3,
  tier: "service",
  realPath: "A map service locates the chosen places and supplies their map positions.",
  items: { key: "pins", parts: ["root", "label"] },
  parts: ["root", "map"],
  states: ["filled", "loading"],
  actions: { items: { root: ["press"] } },
  aliases: ["map", "locations", "nearby", "places"],
  read: (value): string[] => {
    const { pins } = value as { pins: { id: string; label: string }[] };
    return pins.map((pin, index) => `${pin.id}: ${index + 1} ${pin.label}`);
  },
} as const satisfies Meta;

export const props = z.strictObject({
  pins: z
    .array(z.strictObject({ label: text(24), goto: screenId.optional() }))
    .min(1)
    .max(5)
    // Only linked pins expose the row's root action through the shared reader.
    .transform((pins) => pins.map((pin) => ({ ...pin, root: pin.goto }))),
});

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const pins = itemsOf(cast, 3).flatMap((item) => {
    const label = titleOf(item, 24, thing);
    return label ? [{ label }] : [];
  });
  return { pins: pins.length ? pins : [0, 1, 2].map((index) => ({ label: placeholderTitle(index) })) };
}

export const examples = [
  {
    pins: [
      { label: "Greenhouse plant shop", goto: "greenhouse" },
      { label: "Riverside nursery", goto: "riverside" },
      { label: "Garden centre" },
    ],
  },
  {
    pins: [
      { label: "Park gate", goto: "park_gate" },
      { label: "Riverside pick-up", goto: "river_pickup" },
      { label: "Clover's front door" },
      { label: "Pond entrance", goto: "pond" },
      { label: "Hilltop pick-up" },
    ],
  },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "Show where the dog pick-up points are around the neighbourhood, each marked with a number and a matching name below",
    expect: "MapPins",
  },
  {
    kind: "choose",
    need: "Show the places on our walk in the order we visit: Home, Park gate, Pond, then Home again",
    expect: "Route",
  },
  {
    kind: "write",
    brief: "Show nearby plant shops: Greenhouse plant shop, Riverside nursery and Garden centre",
    expect: "MapPins",
  },
  {
    kind: "read",
    screen: 1,
    task: "Open the park gate",
    expect: { address: "m1/r1", action: "press" },
  },
] satisfies Probe[];

export function MapPins({ pins }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  return (
    <KitCard style="inset" part="root" padded>
      <KitMapTile count={pins.length} part="map" />
      {state === "loading" ? (
        <KitContent>
          {pins.map((pin) => (
            <KitSkeleton key={pin.id} rows={1} />
          ))}
        </KitContent>
      ) : (
        pins.map((pin, index) => (
          <KitRow
            key={pin.id}
            item={pin.id}
            label={pin.label}
            goto={pin.goto}
            inset="none"
            leadingAlign="row"
            leading={
              <KitText role="number" tabular part={null}>
                {index + 1}
              </KitText>
            }
          >
            <KitText role="body" part="label">
              {pin.label}
            </KitText>
          </KitRow>
        ))
      )}
    </KitCard>
  );
}

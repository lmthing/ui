import { z } from "zod";
import {
  detailOf,
  itemsOf,
  placeholderTitle,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitCard, KitRouteStop, KitText } from "../kit";

export const meta = {
  id: "Route",
  group: "data",
  purpose: "Follow a path between places, from the first stop to the last.",
  pick: "Show places visited in travel order, with an optional total distance. Not events ordered by time (Timeline) or locations positioned on a map without a visiting order (MapPins).",
  region: "body",
  weight: 2,
  tier: "service",
  realPath: "A directions service calculates the path and distance between the chosen stops.",
  items: { key: "stops", parts: ["root", "label"] },
  parts: ["root", "distance"],
  states: ["filled"],
  aliases: ["journey", "circuit", "itinerary"],
} as const satisfies Meta;

export const props = z.strictObject({
  stops: z
    .array(z.strictObject({ label: text(24), meta: text(16).optional() }))
    .min(2)
    .max(6),
  distance: text(12).optional(),
});

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const stops = itemsOf(cast, 2).flatMap((item) => {
    const label = titleOf(item, 24, thing);
    const detail = detailOf(item, 16, thing);
    return label ? [{ label, ...(detail ? { meta: detail } : {}) }] : [];
  });
  return { stops: [0, 1].map((index) => stops[index] ?? { label: placeholderTitle(index) }) };
}

export const examples = [
  {
    stops: [
      { label: "Home", meta: "Pick up pots" },
      { label: "Garden centre", meta: "Compost & seeds" },
      { label: "Home", meta: "Repot the fern" },
    ],
  },
  {
    stops: [
      { label: "Home", meta: "Meet Clover" },
      { label: "Park gate" },
      { label: "Pond", meta: "Water break" },
      { label: "Home" },
    ],
    distance: "3.2 km",
  },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "Show the places on our dog walk in the order we visit: Home, Park gate, Pond, Home, covering 3.2 km",
    expect: "Route",
  },
  {
    kind: "choose",
    need: "Show today's appointments in time order: plant watering at 09:00, lunch at 12:30, misting at 17:00",
    expect: "Timeline",
  },
  {
    kind: "write",
    brief:
      "Our dog walk visits Home, Park gate, Pond, then Home again, covering 3.2 km; pause for water at Pond",
    expect: "Route",
  },
] satisfies Probe[];

export function Route({ stops, distance }: Props<typeof props, typeof meta>) {
  return (
    <KitCard style="inset" part="root">
      {distance && (
        <KitCard style="plain" padded part="distance">
          <KitText role="caption" tone="muted" align="end" tabular part={null}>
            {distance}
          </KitText>
        </KitCard>
      )}
      {stops.map((stop, index) => (
        <KitRouteStop
          key={stop.id}
          item={stop.id}
          label={stop.label}
          position={index === 0 ? "start" : index === stops.length - 1 ? "end" : "middle"}
        >
          <KitText role="body" part="label">
            {stop.label}
          </KitText>
          {stop.meta && (
            <KitText role="caption" tone="muted" part={null}>
              {stop.meta}
            </KitText>
          )}
        </KitRouteStop>
      ))}
    </KitCard>
  );
}

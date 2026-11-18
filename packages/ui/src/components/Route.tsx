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
import { KitCard, KitContent, KitGrid, KitRouteStop, KitText } from "../kit";

export const meta = {
  id: "Route",
  signature: "route_draw",
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
    need: "Show past plant-care events in date order: watered the fern on June 2, repotted basil on June 5, misted the orchid on June 9",
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
  const measure = distance?.match(/^(\d+(?:[.,]\d+)?)(\s+.*)?$/);
  return (
    <KitCard style="inset" part="root">
      {stops.map((stop, index) => {
        const header = index === 0 && distance;
        const content = (
          <KitContent lineRole="body">
            <KitText role="body" part="label">
              {stop.label}
            </KitText>
            {stop.meta && (
              <KitText role="caption" tone="muted" part={null}>
                {stop.meta}
              </KitText>
            )}
          </KitContent>
        );
        const row = (
          <KitRouteStop
            key={stop.id}
            item={stop.id}
            label={stop.label}
            position={index === 0 ? "start" : index === stops.length - 1 ? "end" : "middle"}
          >
            {header ? (
              <KitGrid columns={2}>
                {content}
                <KitText role={measure ? "number" : "body"} align="end" tabular part={null}>
                  {measure ? measure[1] : distance}
                  {measure?.[2] && (
                    <KitText role="caption" tone="muted" part={null}>
                      {measure[2]}
                    </KitText>
                  )}
                </KitText>
              </KitGrid>
            ) : (
              content
            )}
          </KitRouteStop>
        );
        return header ? (
          <KitCard key={stop.id} style="plain" part="distance" label={distance}>
            {row}
          </KitCard>
        ) : (
          row
        );
      })}
    </KitCard>
  );
}

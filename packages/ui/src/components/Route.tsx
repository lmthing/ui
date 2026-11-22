import { z } from "zod";
import {
  probesFor,
  detailOf,
  itemsOf,
  placeholderTitle,
  text,
  thingOf,
  titleOf,
  variantProps,
  wordsFor,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitCard, KitContent, KitGrid, KitMetaLine, KitRouteStop, KitRow, KitText, useWords } from "../kit";
import { prompt } from "../entry/prompt-Route.generated";

const modes = ["walk", "bike", "car", "transit", "flight"] as const;

export const meta = {
  id: "Route",
  status: "ready",
  signature: "route_draw",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "service",
  realPath: "A directions service calculates the path and distance between the chosen stops.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["meta"] } },
  items: { key: "stops", parts: ["root", "label", "meta"] },
  parts: ["root", "distance", "mode", "duration"],
  states: ["filled"],
  read: (input, _state, lang): string[] => {
    const { mode } = input as { mode?: (typeof modes)[number] };
    return mode ? [wordsFor(lang).routeModes[mode]] : [];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    stops: z
      .array(z.strictObject({ label: text(24), meta: text(16).optional() }))
      .min(2)
      .max(6),
    distance: text(12).optional(),
    mode: z.enum(modes).optional(),
    duration: text(12).optional(),
  })
  .overwrite((value) =>
    value.detail === "brief"
      ? { ...value, stops: value.stops.map(({ meta: _note, ...stop }) => stop) }
      : value,
  );

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const stops = itemsOf(cast, 2).flatMap((item) => {
    const label = titleOf(item, 24, thing);
    const detail = detailOf(item, 16, thing);
    return label ? [{ label, ...(detail ? { meta: detail } : {}) }] : [];
  });
  return { stops: [0, 1].map((index) => stops[index] ?? { label: placeholderTitle(index, lang) }) };
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
  {
    detail: "brief",
    stops: [
      { label: "Home", meta: "Meet Clover" },
      { label: "Park gate" },
      { label: "Pond", meta: "Water break" },
      { label: "Home" },
    ],
    distance: "3.2 km",
  },
  { stops: [{ label: "Home" }, { label: "Park gate" }], mode: "walk", duration: "25 min", distance: "2 km" },
] satisfies z.input<typeof props>[];

const { choose, write } = probesFor("Route");
export const probes = [
  choose(
    "Show the places on our dog walk in the order we visit: Home, Park gate, Pond, Home, covering 3.2 km",
  ),
  choose(
    "Show past plant-care events in date order: watered the fern on June 2, repotted basil on June 5, misted the orchid on June 9",
    "Timeline",
  ),
  write(
    "Our dog walk visits Home, Park gate, Pond, then Home again, covering 3.2 km; pause for water at Pond",
  ),
  {
    ...write(
      "Show the dog walk from Home to Pond, 2 km total. Save the note Water break for Pond but hide stop notes on screen.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  {
    ...write("Show the route from Home to Park gate on foot; it takes 25 min."),
    expectProps: { mode: "walk" },
  },
  {
    ...write("Show the route between Home and Park gate. Add the total travel time exactly as 25 min."),
    expectProps: { duration: "25 min" },
  },
] satisfies Probe[];

type ViewProps = Props<typeof props, typeof meta>;
function TripSummary({ mode, duration }: Pick<ViewProps, "mode" | "duration">) {
  const { routeModes } = useWords().words;
  return (
    <KitRow part={null} label={mode ? routeModes[mode] : duration!}>
      <KitGrid columns={2}>
        <KitMetaLine
          title={mode ? { text: routeModes[mode], part: "mode" } : { text: duration, part: "duration" }}
        />
        {mode && duration && (
          <KitText role="body" part="duration" align="end" tabular>
            {duration}
          </KitText>
        )}
      </KitGrid>
    </KitRow>
  );
}

export function Route({ stops, distance, detail, mode, duration }: ViewProps) {
  const measure = distance?.match(/^(\d+(?:[.,]\d+)?)(\s+.*)?$/);
  const hasSummary = Boolean(mode || duration);
  return (
    <KitCard style="inset" part="root">
      {hasSummary && <TripSummary {...{ mode, duration }} />}
      {stops.map((stop, index) => {
        const header = index === 0 && distance;
        const content = (
          <KitContent lineRole="body">
            <KitText role="body" part="label">
              {stop.label}
            </KitText>
            {stop.meta && (
              <KitText role="caption" tone="muted" part="meta">
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
                {routeDistance(distance, measure, detail === "brief" || hasSummary)}
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

function routeDistance(distance: string, measure: RegExpMatchArray | null | undefined, compact: boolean) {
  return (
    <KitText
      role={measure ? "number" : "body"}
      numberScale={compact ? "compact" : "display"}
      align="end"
      tabular
      part={null}
    >
      {measure ? measure[1] : distance}
      {measure?.[2] && (
        <KitText role="caption" tone="muted" part={null}>
          {measure[2]}
        </KitText>
      )}
    </KitText>
  );
}

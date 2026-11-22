import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { clockReadings } from "../copy";
import { tripsWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Clocks.generated";

// prettier-ignore
const zones = [
  "Etc/UTC", "Pacific/Honolulu", "America/Anchorage", "America/Los_Angeles",
  "America/Vancouver", "America/Phoenix", "America/Denver", "America/Chicago",
  "America/Mexico_City", "America/New_York", "America/Toronto", "America/Halifax",
  "America/Bogota", "America/Lima", "America/Santiago", "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires", "Atlantic/Reykjavik",
  "Europe/London", "Europe/Dublin", "Europe/Lisbon", "Europe/Madrid",
  "Europe/Paris", "Europe/Berlin", "Europe/Rome", "Europe/Amsterdam",
  "Europe/Zurich", "Europe/Stockholm", "Europe/Oslo", "Europe/Copenhagen",
  "Europe/Warsaw", "Europe/Athens", "Europe/Istanbul", "Europe/Moscow",
  "Africa/Cairo", "Africa/Nairobi", "Africa/Johannesburg",
  "Asia/Dubai", "Asia/Jerusalem", "Asia/Kolkata", "Asia/Kathmandu",
  "Asia/Bangkok", "Asia/Jakarta", "Asia/Singapore", "Asia/Hong_Kong",
  "Asia/Shanghai", "Asia/Manila", "Asia/Taipei", "Asia/Seoul", "Asia/Tokyo",
  "Australia/Perth", "Australia/Adelaide", "Australia/Brisbane", "Australia/Sydney",
  "Australia/Melbourne", "Pacific/Auckland",
] as const;

// Core first: Timer/up measures elapsed time, not simultaneous local times and differences from home.
export const meta = {
  id: "Clocks",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The device's clock and time zone data provide the current times and offsets.",
  variants: {
    arrange: ["grid", "rows"],
  },
  parts: ["root"],
  items: { key: "places", parts: ["root", "label", "time", "offset", "daylight"] },
  states: ["filled"],
  read: (input, state, lang) => {
    if (state !== "filled") return [];
    const { places } = input as { places: z.output<typeof place>[] };
    const { placeLine } = tripsWordsFor(lang).clocks;
    return clockReadings(places, new Date(), lang).map(({ label, time, offset, daylight }) =>
      placeLine(JSON.stringify(label), time, offset, daylight),
    );
  },
} as const satisfies c.Meta;

const place = z.strictObject({ label: c.text(16), zone: z.enum(zones) });

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  places: z.array(place).min(2).max(4),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 2);
  return {
    places: [0, 1].map((index) => {
      const item = items[index];
      return {
        label: (item && c.titleOf(item, 16, thing)) ?? c.placeholderTitle(index, lang),
        zone: "Etc/UTC",
      };
    }),
  };
}

const comparisonPlaces = [
  { label: "New York", zone: "America/New_York" },
  { label: "Vancouver", zone: "America/Vancouver" },
  { label: "Auckland", zone: "Pacific/Auckland" },
  { label: "Kathmandu", zone: "Asia/Kathmandu" },
] satisfies z.input<typeof place>[];

export const examples = [
  { places: comparisonPlaces },
  { places: comparisonPlaces },
  { arrange: "rows", places: comparisonPlaces },
] satisfies z.input<typeof props>[];

const { choose, write } = c.probesFor("Clocks");
export const probes = [
  choose("Show what time it is right now in London, Tokyo and New York side by side, compared with London"),
  choose("Give me a stopwatch with start and stop so I can measure the time a walk takes", "Timer"),
  write("Compare the current times in London at home, Tokyo and New York."),
  {
    ...write(
      "Show the current time in London (home), Tokyo and New York. Put each city and its clock on its own row, one below the next instead of side by side.",
    ),
    variant: { axis: "arrange", value: "rows" },
  },
] satisfies c.Probe[];

const columns = 2;
type Reading = ReturnType<typeof clockReadings>[number];
type ClockPlaceProps = {
  reading: Reading;
  density: c.ThemeDensity;
  inRows: boolean;
  home: boolean;
};

// prettier-ignore
function ClockPlace({ reading, density, inRows, home }: ClockPlaceProps) {
  const { label, time, offset, isDay } = reading;
  const tone = home ? "accent" : "text";
  const place = <kit.KitText part="label" role="label" density="comfortable" tone={tone}>{label}</kit.KitText>;
  const clock = <kit.KitFigure density="comfortable" value={{ part: "time", text: time, tone }} align={inRows ? "end" : "start"} />;
  const footer = (
    <kit.KitContent density={density} leadingAlign="row"
      lead={<kit.KitIcon part="daylight" name={isDay ? "sun" : "moon"} scale="sm" />}>
      <kit.KitText part="offset" role="caption" tone={home ? tone : "muted"} density="comfortable">{offset}</kit.KitText>
    </kit.KitContent>
  );
  if (inRows) return (
    <kit.KitGrid fitLast density={density}>
      <kit.KitContent density={density}>{place}{footer}</kit.KitContent>
      {clock}
    </kit.KitGrid>
  );
  if (density === "compact") return <>{place}{clock}{footer}</>;
  return <kit.KitContent density={density}>{place}{clock}{footer}</kit.KitContent>;
}

export function Clocks(input: c.Props<typeof props, typeof meta>) {
  const { words, lang } = kit.useWords(tripsWordsFor);
  const density = kit.useKit().density;
  const surface = "card";
  const arrange = kit.useVariant("arrange", meta.variants.arrange, input.arrange);
  const inRows = arrange === "rows";
  const readings = clockReadings(input.places, new Date(), lang);
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      <kit.KitGrid list listRowGap="cards" {...{ columns, density, arrange }}>
        {input.places.map(({ id }, index) => {
          const reading = readings[index]!;
          const { label, time, offset, daylight } = reading;
          return (
            <kit.KitContent
              key={id}
              density={density}
              group={!inRows && index >= columns ? "response" : "content"}
            >
              <kit.KitRow
                item={id}
                part="root"
                inline
                density={density}
                label={words.clocks.placeLine(label, time, offset, daylight)}
              >
                <ClockPlace {...{ reading, density, inRows }} home={index === 0} />
              </kit.KitRow>
            </kit.KitContent>
          );
        })}
      </kit.KitGrid>
    </kit.KitCard>
  );
}

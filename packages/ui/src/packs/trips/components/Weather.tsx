import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { weatherCopy, weatherReading } from "../copy";
import { tripsWordsFor } from "../lang";

// Core first: Stats/default cannot request a place's service-backed forecast with daily conditions.
export const meta = {
  id: "Weather",
  status: "ready",
  group: "data",
  purpose: "See the forecast or typical weather for the place and dates of a trip.",
  pick: "A place's local weather or trip forecast, including conditions and rain chance. Not personal figures (Stats) or a series showing a trend (Sparkline).",
  writeHints: [
    "Write the place and optional trip dates. The service supplies all weather data, never the Writer.",
    'When asked to hide only the main condition text, write detail "brief", density null, and surface null. Keep the icon, temperatures and next days. Do not write "card" or "comfortable" unless requested.',
  ],
  region: "body",
  weight: 2,
  tier: "service",
  realPath: "A weather service provides forecasts and typical monthly weather.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["condition"] } },
  parts: ["root", "place", "today", "forecast", "condition", "message", "sub"],
  // The host's offline case uses the error state with the Empty offline treatment.
  states: ["filled", "loading", "error"],
  deviceData: ["weather"],
  previewDeviceData: ({ input, state }) => {
    if (state === "loading") return {};
    const query = { place: input.place, from: input.from, to: input.to };
    const sample = state === "error" ? { kind: "offline" } : input.from ? typicalExample : forecastExample;
    return { weather: [{ ...sample, ...query }] };
  },
  read: (input, state, lang, data): string[] =>
    state === "filled" ? weatherReading(input as z.output<typeof props>, data, lang) : [],
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    place: c.text(24),
    from: c.isoDate.optional(),
    to: c.isoDate.optional(),
  })
  .refine(({ from, to }) => !from || !to || from <= to, { path: ["to"] });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const item = c.itemsOf(cast, 1)[0];
  return { place: (item && c.titleOf(item, 24, c.thingOf(cast, item.type))) ?? c.placeholderTitle(0, lang) };
}

export const examples = [
  { place: "Reykjavik" },
  { place: "Tokyo", from: "2027-03-04", to: "2027-03-13" },
] satisfies z.input<typeof props>[];

const forecastExample = {
  kind: "forecast",
  sample: true,
  today: { condition: "cloudy", high: 7, low: 2 },
  next: [
    { date: "2027-03-05", condition: "rain", high: 6, low: 2, rain: 85 },
    { date: "2027-03-06", condition: "cloudy", high: 8, low: 3, rain: 25 },
    { date: "2027-03-07", condition: "clear", high: 9, low: 3, rain: 10 },
  ],
};
const typicalExample = {
  kind: "typical",
  sample: true,
  month: "2027-03-04",
  summary: { condition: "cloudy", high: 14, low: 5 },
};

const { choose, write } = c.probesFor("Weather");
export const probes = [
  choose(
    "Look up the forecast for Reykjavik, with today's high and low and the rain chances on the next few days",
  ),
  choose(
    "Show three summary numbers for my trips: 4 countries, 12 nights and 3 train rides, each with a label",
    "Stats",
  ),
  write(
    "Show the weather for Tokyo from 2027-03-04 to 2027-03-13. Look up the conditions rather than guessing them.",
  ),
  {
    ...write(
      "Look up the weather for Reykjavik. Keep the weather icon, high and low and next days, but hide the condition text beside today's temperatures.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
] satisfies c.Probe[];

type WeatherProps = c.Props<typeof props, typeof meta>;
type Density = NonNullable<WeatherProps["density"]>;
type WeatherCopy = ReturnType<typeof weatherCopy>;
const stripColumns = 3;

// prettier-ignore
function ForecastStrip({ next, density }: { next: NonNullable<WeatherCopy["next"]>; density: Density }) {
  const { words } = kit.useWords(tripsWordsFor);
  const cells = next.map((day) => (
    <kit.KitRow key={day.date} label={words.weather.dayLabel(day.label, day.condition)} role="group" inline density={density}>
      <kit.KitContent density={density} align="center">
        <kit.KitText part={null} role="body" density={density}>{day.label}</kit.KitText>
        <kit.KitIcon name={day.icon} decorative />
        <kit.KitText part={null} role="number" numberScale="compact" density={density} tabular lines={1}>{day.range}</kit.KitText>
        <kit.KitText part={null} role="body" tone={day.warn ? "warn" : "muted"} density={density} lines={1}>{day.rain}</kit.KitText>
      </kit.KitContent>
    </kit.KitRow>
  ));
  return (
    <kit.KitContent group="response" density={density}>
      <kit.KitRow part="forecast" label={words.weather.forecast} role="group" inline density={density}>
        {next.length <= stripColumns
          ? <kit.KitGrid columns={stripColumns} list density={density}>{cells}</kit.KitGrid>
          : <kit.KitStrip list density={density}>{cells}</kit.KitStrip>}
      </kit.KitRow>
    </kit.KitContent>
  );
}

// prettier-ignore
function WeatherSummary({ summary, density, detail }: {
  summary: NonNullable<WeatherCopy["summary"]>;
  density: Density;
  detail: WeatherProps["detail"];
}) {
  const { words } = kit.useWords(tripsWordsFor);
  return (
    <kit.KitRow label={summary.reading} role="group" inline density={density} lineRole="number" leading={<kit.KitIcon name={summary.icon} scale="lg" decorative />}>
      <kit.KitText part="today" role="number" density={density} tabular lines={1}>{words.weather.celsiusRange(summary.range)}</kit.KitText>
      {detail === "full" && (
        <kit.KitText part="condition" role="body" tone="muted" density={density}>
          {summary.condition}
        </kit.KitText>
      )}
    </kit.KitRow>
  );
}

// prettier-ignore
function WeatherLoading({ place, density, detail }: { place: string; density: Density; detail: WeatherProps["detail"] }) {
  const { words: { weather }, lang } = kit.useWords(tripsWordsFor);
  // Use sample strings only to measure the shapes of the hidden loading bars.
  const sample = weatherCopy({ place }, { weather: [{ ...forecastExample, place }] }, lang);
  if (sample.notice) return null;
  const temperatures = weather.celsiusRange(sample.summary.range);
  const condition = detail === "full" ? sample.summary.condition : undefined;
  return <>
    <kit.KitSkeleton shape="figure" inset="none" density={density}
      content={[["heading", place], ["body", weather.todayHeading(weather.today, sample.heading)]]} />
    <kit.KitSkeleton shape="figure" lead="dot" inset="none" density={density}
      content={[["number", temperatures], ["body", condition]]} />
    <kit.KitContent group="response" density={density}>
      <kit.KitGrid columns={stripColumns} density={density}>
        {sample.next.map((day) => (
          <kit.KitSkeleton key={day.date} shape="figure" inset="none" density={density} centered
            content={[["body", day.label], ["caption", weather.iconPlaceholder], ["number", day.range, "center", "compact"], ["body", day.rain]]} />
        ))}
      </kit.KitGrid>
    </kit.KitContent>
  </>;
}

// prettier-ignore
export function Weather(input: WeatherProps) {
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const { words, lang } = kit.useWords(tripsWordsFor);
  const data = kit.useDeviceData();
  const copy = weatherCopy(input, data, lang, state === "error");
  return (
    <kit.KitCard part="root" padded density={density} surface={surface}>
      {state === "loading" ? <WeatherLoading place={input.place} {...{ density, detail }} /> : copy.notice ? (
        <>
          {state === "filled" && <kit.KitText part="place" role="heading" density={density}>{input.place}</kit.KitText>}
          <kit.KitEmpty part="message" decorativeIcon {...copy.notice} />
        </>
      ) : (
        <>
          <kit.KitContent density={density}>
            <kit.KitText part="place" role="heading" density={density}>{input.place}</kit.KitText>
            <kit.KitText part={null} role="body" tone="muted" density={density}>
              {copy.today ? words.weather.todayHeading(copy.today, copy.heading) : copy.heading}
            </kit.KitText>
          </kit.KitContent>
          <WeatherSummary summary={copy.summary} {...{ density, detail }} />
          {copy.next.length > 0 && <ForecastStrip next={copy.next} density={density} />}
        </>
      )}
    </kit.KitCard>
  );
}

import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { weatherCopy } from "../copy";
import { tripsWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Weather.generated";

// Core first: Stats/default cannot request a place's service-backed forecast with daily conditions.
export const meta = {
  id: "Weather",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "service",
  realPath: "A weather service provides forecasts and typical monthly weather.",
  variants: { detail: ["full", "brief"] },
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
  read: (projected, state, lang, data): string[] => {
    if (state !== "filled") return [];
    const input = projected as z.output<typeof props>;
    const copy = weatherDisplay(input, data, lang);
    if (copy.notice) return [copy.notice.title, copy.notice.sub];
    const { reading } = tripsWordsFor(lang).weather;
    const { range, condition } = copy.summary;
    return [
      copy.heading,
      reading(input.detail === "brief" ? [range] : [range, condition]),
      ...copy.next.map((day) => reading([day.label, day.condition, day.range, day.rain])),
    ];
  },
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
type Density = c.ThemeDensity;
type WeatherDisplay = ReturnType<typeof weatherDisplay>;
const stripColumns = 3;

function weatherDisplay(...[input, data, lang, failed]: Parameters<typeof weatherCopy>) {
  const copy = weatherCopy(input, data, lang, failed);
  if (copy.notice) return copy;
  const { todayHeading, celsiusRange } = tripsWordsFor(lang).weather;
  const heading = copy.today ? todayHeading(copy.today, copy.heading) : copy.heading;
  return { ...copy, heading, summary: { ...copy.summary, range: celsiusRange(copy.summary.range) } };
}

// prettier-ignore
function ForecastStrip({ next, density }: { next: NonNullable<WeatherDisplay["next"]>; density: Density }) {
  const { words } = kit.useWords(tripsWordsFor);
  const loading = kit.useComponentState() === "loading";
  const cells = next.map((day) => (
    <kit.KitRow key={day.date} label={words.weather.dayLabel(day.label, day.condition)} role="group" inline density={density}>
      <kit.KitContent density={density} align="center">
        <kit.KitLayoutText line={{ text: day.label }} density={density} align="center" />
        <kit.KitIcon name={day.icon} decorative loading={loading} />
        <kit.KitLayoutText line={{ text: day.range, role: "figure", compact: true, tabular: true, lines: 1 }} density={density} align="center" />
        <kit.KitLayoutText line={{ text: day.rain, tone: day.warn ? "warn" : "muted", lines: 1 }} density={density} align="center" />
      </kit.KitContent>
    </kit.KitRow>
  ));
  return (
    <kit.KitContent group="response" density={density}>
      <kit.KitRow part={loading ? null : "forecast"} label={words.weather.forecast} role="group" inline density={density}>
        {next.length <= stripColumns
          ? <kit.KitGrid columns={stripColumns} list density={density}>{cells}</kit.KitGrid>
          : <kit.KitStrip list density={density}>{cells}</kit.KitStrip>}
      </kit.KitRow>
    </kit.KitContent>
  );
}

// prettier-ignore
function WeatherSummary({ summary, density, detail }: { summary: NonNullable<WeatherDisplay["summary"]>; density: Density; detail: WeatherProps["detail"] }) {
  const loading = kit.useComponentState() === "loading";
  return (
    <kit.KitRow label={summary.reading} role="group" inline fitContent density={density} lineRole="number"
      leading={<kit.KitIcon name={summary.icon} scale="lg" decorative loading={loading} />}>
      <kit.KitFigure density={density} value={{ text: summary.range, part: "today", lines: 1 }}
        caption={detail === "full" && <kit.KitLayoutText line={{ text: summary.condition, part: "condition", tone: "muted" }} density={density} />} />
    </kit.KitRow>
  );
}

// prettier-ignore
function WeatherLoading({ place, density, detail }: { place: string; density: Density; detail: WeatherProps["detail"] }) {
  const { lang } = kit.useWords();
  // Use sample strings only to measure the shapes of the hidden loading bars.
  const sample = weatherDisplay({ place }, { weather: [{ ...forecastExample, place }] }, lang);
  if (sample.notice) return null;
  return <>
    <WeatherHeading {...{ place, density }} heading={sample.heading} />
    <WeatherSummary summary={sample.summary} {...{ density, detail }} />
    <ForecastStrip next={sample.next} density={density} />
  </>;
}

// prettier-ignore
function WeatherHeading({ place, heading, density }: { place: string; heading: string; density: Density }) {
  return <kit.KitHeader title={{ text: place, part: "place", role: "body", strong: true }}
    meta={{ text: heading, role: "body" }} density={density} />;
}

// prettier-ignore
export function Weather(input: WeatherProps) {
  const state = kit.useComponentState();
  const density = kit.useKit().density;
  const surface = "card";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const { lang } = kit.useWords();
  const copy = weatherDisplay(input, kit.useDeviceData(), lang, state === "error");
  return (
    <kit.KitCard part="root" padded density={density} surface={surface}>
      {state === "loading" ? <kit.KitState density={density} loading={<WeatherLoading place={input.place} {...{ density, detail }} />} /> : copy.notice ? (
        <>
          {state === "filled" && <kit.KitText part="place" role="heading" density={density}>{input.place}</kit.KitText>}
          <kit.KitEmpty part="message" decorativeIcon {...copy.notice} />
        </>
      ) : (
        <>
          <WeatherHeading place={input.place} heading={copy.heading} density={density} />
          <WeatherSummary summary={copy.summary} {...{ density, detail }} />
          {copy.next.length > 0 && <ForecastStrip next={copy.next} density={density} />}
        </>
      )}
    </kit.KitCard>
  );
}

import { z } from "zod";
import {
  dateLocaleOf,
  isoDate,
  numberLine,
  percentageLine,
  text,
  type DeviceData,
  type IconName,
} from "../../../catalog";
import { tripsWordsFor } from "../lang";

const query = z.object({ place: text(24), from: isoDate.optional(), to: isoDate.optional() });
type Query = z.output<typeof query>;
const conditions = z.enum(["clear", "cloudy", "rain"]);
const conditionIcon = { clear: "sun", cloudy: "cloud", rain: "cloud_rain" } satisfies Record<
  z.output<typeof conditions>,
  IconName
>;
const temperatures = z
  .object({ condition: conditions, high: z.number(), low: z.number() })
  .refine(({ high, low }) => high >= low);
const weatherDay = temperatures.safeExtend({ date: isoDate, rain: z.number().min(0).max(100) });
const snapshot = z.discriminatedUnion("kind", [
  query.extend({
    kind: z.literal("forecast"),
    sample: z.boolean().optional(),
    today: temperatures,
    next: z.array(weatherDay).max(6),
  }),
  query.extend({
    kind: z.literal("typical"),
    sample: z.boolean().optional(),
    month: isoDate,
    summary: temperatures,
  }),
  query.extend({ kind: z.literal("offline") }),
]);

/** The snapshot is keyed by the requested place and date range, not by model-authored values. */
function weatherSnapshot(input: Query, data?: DeviceData) {
  for (const record of data?.weather ?? []) {
    const parsed = snapshot.safeParse(record);
    if (parsed.success) {
      const value = parsed.data;
      if (value.place === input.place && value.from === input.from && value.to === input.to) return value;
    }
  }
}

function temperatureCopy(value: z.output<typeof temperatures>, lang?: string) {
  const { conditions, degrees, range, highsAndLows } = tripsWordsFor(lang).weather;
  const high = degrees(numberLine(value.high, lang));
  const low = degrees(numberLine(value.low, lang));
  return {
    range: range(high, low),
    reading: highsAndLows(high, low),
    condition: conditions[value.condition],
    icon: conditionIcon[value.condition],
  };
}

const highRainChance = 60;
const localDate = (date: string) => new Date(`${date}T00:00:00Z`);

/** Project the same localized text into the view and the agent's reading. */
export function weatherCopy(input: Query, data?: DeviceData, lang?: string, failed = false) {
  const value = weatherSnapshot(input, data);
  const words = tripsWordsFor(lang).weather;
  if (failed || !value || value.kind === "offline") {
    const offline = value?.kind === "offline";
    return {
      notice: {
        title: offline ? words.offline : words.unavailable,
        sub: offline ? words.reconnect : words.tryLater,
        icon: offline ? ("wifi" as const) : ("alert" as const),
      },
    };
  }
  const locale = dateLocaleOf(lang);
  if (value.kind === "typical") {
    const month = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
    return {
      heading: (value.sample ? words.sampleTypical : words.typical)(month.format(localDate(value.month))),
      summary: temperatureCopy(value.summary, lang),
      next: [],
    };
  }
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  return {
    heading: value.sample ? words.sampleForecast : words.forecast,
    today: words.today,
    summary: temperatureCopy(value.today, lang),
    next: value.next.map((day) => ({
      date: day.date,
      label: weekday.format(localDate(day.date)),
      ...temperatureCopy(day, lang),
      rain: words.rain(percentageLine(day.rain, lang)),
      warn: day.rain >= highRainChance,
    })),
  };
}

export function weatherReading(input: Query & { detail?: string }, data?: DeviceData, lang?: string) {
  const words = tripsWordsFor(lang).weather;
  const copy = weatherCopy(input, data, lang);
  if (copy.notice) return [copy.notice.title, copy.notice.sub];
  const summary = [
    copy.today,
    copy.summary.reading,
    input.detail === "brief" ? undefined : copy.summary.condition,
  ].filter((line): line is string => line !== undefined);
  return [
    copy.heading,
    words.reading(summary),
    ...copy.next.map((day) => words.reading([day.label, day.condition, day.reading, day.rain])),
  ];
}

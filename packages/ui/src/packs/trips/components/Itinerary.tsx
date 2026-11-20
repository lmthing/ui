import { z } from "zod";
import {
  clock,
  dateLocaleOf,
  detailOf,
  durationLine,
  isoDate,
  itemsOf,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  timeOfDayLine,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
} from "../../../catalog";

const maxStops = 6;
const stopParts = Array.from({ length: maxStops }, (_, i) => `stop_${i + 1}`);
const stopActions = Object.fromEntries(stopParts.map((part) => [part, ["press"] as const]));

// Core first: Timeline/day cannot nest timed stops and travel legs under independently foldable dates.
export const meta = {
  id: "Itinerary",
  status: "draft",
  group: "data",
  purpose: "See the whole trip day by day, including stops and travel between them.",
  pick: "A whole trip grouped into foldable dated days with places, timed stops and travel legs. Not a single day's time order (Timeline), a path through places (Route), or a family week (Agenda).",
  writeHints: [
    "Use 1–14 dated days and 1–6 stops per day. Give each stop a title and a goto screen id. Only a travel stop may have minutes.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The plan lives on the device; sharing it needs a shared app.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root"],
  items: { key: "days", parts: ["root", "date", "place", ...stopParts] },
  states: ["filled", "empty"],
  actions: { items: { root: ["toggle"], ...stopActions } },
  read: (input, state, lang) => {
    if (state !== "filled") return [];
    const formatter = new Intl.DateTimeFormat(dateLocaleOf(lang), {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
    return (input as { days: z.output<typeof day>[] }).days.map(({ date, place, stops }) => {
      const when = formatter.format(new Date(`${date}T00:00:00Z`));
      const list = stops.map(({ time, title, minutes }) =>
        [
          time && timeOfDayLine(time, lang),
          JSON.stringify(title),
          minutes === undefined ? undefined : durationLine(minutes, lang),
        ]
          .filter(Boolean)
          .join(" "),
      );
      return `${when} ${JSON.stringify(place)}: ${list.join(", ")}`;
    });
  },
} as const satisfies Meta;

const stop = z
  .strictObject({
    time: clock.optional(),
    title: text(32),
    kind: z.enum(["stop", "travel", "stay", "meal"]),
    minutes: z.int().min(1).max(10080).optional(),
    goto: screenId,
  })
  .refine(({ kind, minutes }) => kind === "travel" || minutes === undefined, { path: ["minutes"] });

const day = z
  .strictObject({
    date: isoDate,
    place: text(24),
    stops: z.array(stop).min(1).max(maxStops),
  })
  .overwrite((value) => ({
    ...value,
    ...Object.fromEntries(stopParts.map((part, index) => [part, value.stops[index]])),
  }));

export const props = z.strictObject({
  ...variantProps(meta.variants),
  days: z.array(day).min(1).max(14),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 3);
  const first = items[0];
  return {
    days: [
      {
        date: "2026-11-20",
        place: (first && detailOf(first, 24, thing)) ?? placeholderTitle(0, lang),
        stops: (items.length ? items : [undefined]).map((item, index) => ({
          title: (item && titleOf(item, 32, thing)) ?? placeholderTitle(index, lang),
          kind: "stop",
          goto: item && screenId.safeParse(item.id).success ? item.id : "detail",
        })),
      },
    ],
  };
}

export const examples = [
  {
    days: [
      {
        date: "2027-03-04",
        place: "Tokyo",
        stops: [
          { time: "09:00", title: "Shinjuku Gyoen", kind: "stop", goto: "garden" },
          { time: "12:30", title: "Lunch at the market", kind: "meal", goto: "market" },
        ],
      },
      {
        date: "2027-03-05",
        place: "Kyoto",
        stops: [
          { time: "08:30", title: "Train to Kyoto", kind: "travel", minutes: 130, goto: "train" },
          { title: "Check in at the inn", kind: "stay", goto: "inn" },
        ],
      },
    ],
  },
  {
    density: "compact",
    days: [
      {
        date: "2027-05-10",
        place: "Inverness",
        stops: [{ time: "10:00", title: "River Ness walk", kind: "stop", goto: "river" }],
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Itinerary");
export const probes = [
  choose("Give each date of our trip its own collapsible day, with timed visits and train legs inside"),
  choose("Show just Thursday's appointments in chronological order, with a time beside each", "Timeline"),
  write(
    "Plan two collapsible days: Tokyo on 2027-03-04, garden visit at 09:00 linking to garden; Kyoto on 2027-03-05, 130-minute train at 08:30 linking to train.",
  ),
  read("Open the Shinjuku Gyoen stop", { address: "i1/r1/stop_1", action: "press" }),
] satisfies Probe[];

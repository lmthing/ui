import { z } from "zod";
// prettier-ignore
import {
  clock, detailOf, formatAddress, isoDate, itemsOf, placeholderTitle, probesFor, screenId,
  text, thingOf, titleOf, variantProps, type FallbackInput, type Meta, type Probe, type Props,
} from "../../../catalog";
import * as kit from "../../../kit";
import { TimelineRail, type TimelineRailRow } from "../../../kit/timeline";
import { initialItineraryDay, itineraryDate, itineraryStopCopy, readItinerary } from "../copy";
import { tripsWordsFor } from "../lang";

const positions = [1, 2, 3, 4, 5, 6] as const;
const stopParts = positions.map((n) => `stop_${n}` as const);
const durationParts = positions.map((n) => `duration_${n}` as const);
const timeParts = stopParts.map((part) => `${part}_time` as const);
const stopActions = Object.fromEntries(stopParts.map((part) => [part, ["press"] as const]));
const icons = { stop: "pin", travel: "train", meal: "utensils", stay: "bed" } as const;

// Core first: Timeline/day cannot nest timed stops and travel legs under independently foldable dates.
export const meta = {
  id: "Itinerary",
  status: "ready",
  group: "data",
  purpose: "See the whole trip day by day, including stops and travel between them.",
  pick: "A whole trip grouped into foldable dated days with places, timed stops and travel legs. Not a single day's time order (Timeline), a path through places (Route), or a family week (Agenda).",
  writeHints: [
    "Use 1–14 dated days and 1–6 stops per day. Give each stop a title and a goto screen id. Only a travel stop may have minutes.",
    'Leave density and surface null unless requested. To hide travel durations, set only detail to "brief" and keep minutes on travel stops.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The plan lives on the device; sharing it needs a shared app.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: durationParts } },
  parts: ["root", "title"],
  items: { key: "days", parts: ["root", "date", "place", ...stopParts, ...timeParts, ...durationParts] },
  states: ["filled", "empty"],
  actions: { items: { root: ["toggle"], ...stopActions } },
  read: (input, state, lang) => {
    if (state !== "filled") return [];
    const { days, detail } = input as { days: z.output<typeof day>[]; detail?: string };
    return readItinerary(days, detail !== "brief", lang);
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
    stops: z.array(stop).min(1).max(positions.length),
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

// prettier-ignore
export const examples = [
  {
    days: [
      {
        date: "2027-03-04",
        place: "Tokyo",
        stops: [
          { time: "09:00", title: "Shinjuku Gyoen", kind: "stop", goto: "garden" },
          { time: "16:00", title: "Train to Kyoto", kind: "travel", minutes: 130, goto: "train" },
        ],
      },
      {
        date: "2027-03-05",
        place: "Kyoto",
        stops: [
          { time: "08:30", title: "Nanzen-ji", kind: "stop", goto: "temple" },
          { title: "Inn check-in", kind: "stay", goto: "inn" },
        ],
      },
    ],
  },
  {
    days: [
      {
        date: "2027-05-10",
        place: "Inverness",
        stops: [
          { time: "10:00", title: "River Ness walk", kind: "stop", goto: "river" },
          { time: "12:30", title: "Market lunch", kind: "meal", goto: "market" },
          { title: "Riverside inn", kind: "stay", goto: "stay" },
        ],
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
  {
    ...write(
      "On 2027-03-05 in Kyoto show just the 08:30 train to Kyoto, linking to train. Keep its 130-minute duration in the plan but hide the duration in the row. Leave the usual spacing and card appearance alone.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the Shinjuku Gyoen stop", { address: "i1/r1/stop_1", action: "press" }),
] satisfies Probe[];

type ItineraryProps = Props<typeof props, typeof meta>;
type DayProps = Pick<ItineraryProps, "density" | "detail">;

// prettier-ignore
function ItineraryDay({ day, initial, density, detail }: DayProps & { day: ItineraryProps["days"][number]; initial: boolean }) {
  const scope = kit.usePartContext(), { controller } = kit.useKit();
  const toggled = kit.useControlValue(formatAddress({ ...scope, item: day.id }), false);
  // Like List/expand, static rendering exposes the full content; a phone folds it.
  const open = !controller || initial !== toggled;
  const { lang, words } = kit.useWords(tripsWordsFor);
  const date = itineraryDate(day.date, lang);
  const rows = open ? day.stops.map((stop, index): TimelineRailRow<(typeof stopParts)[number]> => {
    const { time, duration } = itineraryStopCopy(stop, detail !== "brief", lang);
    return {
      kind: "rail", part: stopParts[index]!, goto: stop.goto,
      slots: {
        title: { part: null, text: stop.title }, icon: icons[stop.kind],
        time: { part: timeParts[index]!, text: time ?? words.itinerary.untimed },
        ...(duration ? { detail: { part: durationParts[index]!, text: duration } } : {}),
      },
    };
  }) : [];
  return <TimelineRail item={day.id} label={words.itinerary.dayLabel(date, day.place)} {...{ density, open, rows }}
    title={{ part: "place", text: day.place }} date={{ part: "date", text: date }} />;
}

// prettier-ignore
export function Itinerary(input: ItineraryProps) {
  const { days, detail, surface } = input;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const empty = kit.useComponentState() === "empty", current = initialItineraryDay(days, new Date());
  return (
    <kit.KitCard {...{ density, surface }} padded={!empty} part="root">
      <kit.KitState icon="calendar_days" part="title" density={density}>
        <kit.KitContent density={density}>
          {days.map((day, index) => (
            <kit.KitContent key={day.id} density={density} group={index > 0 ? "response" : "content"}>
              <ItineraryDay {...{ day, density, detail }} initial={index === current} />
            </kit.KitContent>
          ))}
        </kit.KitContent>
      </kit.KitState>
    </kit.KitCard>
  );
}

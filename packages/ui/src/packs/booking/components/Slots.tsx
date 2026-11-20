import {
  useWords,
  KitCard,
  KitEmpty,
  KitSkeleton,
  KitSlotGrid,
  KitText,
  useComponentState,
  useEmptyThing,
  useVariant,
} from "../../../kit";
import { bookingWordsFor } from "../lang";
import { z } from "zod";
import {
  clock,
  clockLine,
  detailOf,
  durationLine,
  emptyLine,
  itemsOf,
  placeholderValue,
  probesFor,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import { slotDetailLine, slotLoadingLine } from "../copy";

// Core first: Calendar/week selects dates, not free and taken times within a day.
export const meta = {
  id: "Slots",
  status: "ready",
  group: "input",
  purpose: "Pick an available appointment start time, such as 09:00.",
  pick: "Select free HH:MM start times, keeping taken times disabled. Not deciding which day, date or week to book: use Calendar for that, even in a booking app. Not working hours (Availability).",
  writeHints: [
    "Times are unique HH:MM start times. at, when present, must exactly match a free time; omit it if none is selected.",
    'minutes is the appointment length, from 5 to 600. Only use arrange "rows" when asked for one row per time or for computed end times; otherwise leave arrange null.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Free times computed on the device from working hours minus bookings.",
  variants: { arrange: ["grid", "rows"] },
  items: { key: "times", parts: ["root", "time"] },
  parts: ["root", "times", "minutes", "sub"],
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["select"] }, when: { root: { taken: false } } },
  select: { prop: "at", value: { field: "time" } },
  read: (input, state, lang?: string): string[] => {
    const { slotLabels } = bookingWordsFor(lang);

    if (state !== "filled") return [];
    const { times, minutes, arrange } = input as z.output<typeof props>;
    return [
      durationLine(minutes, lang),
      ...times.flatMap(({ time, taken }) => [
        `${time}${taken ? ` (${slotLabels.taken})` : ""}`,
        slotDetailLine(time, minutes, arrange, taken, lang),
      ]),
    ];
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    times: z
      .array(z.strictObject({ time: clock.meta({ kind: "text" }), taken: z.boolean() }))
      .min(1)
      .max(24),
    at: clock.optional(),
    minutes: z.int().min(5).max(600),
  })
  .refine(({ times, at }) => !at || times.some((slot) => slot.time === at && !slot.taken), { path: ["at"] })
  .refine(({ times }) => new Set(times.map(({ time }) => time)).size === times.length, {
    path: ["times"],
    message: "Each start time must be unique",
  });
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const times = itemsOf(cast, 24).flatMap((item) => {
    const value = [titleOf(item, 32, thing), detailOf(item, 36, thing)].find(
      (text) => clock.safeParse(text).success,
    );
    return value ? [{ time: value, taken: false }] : [];
  });
  return {
    times: times.length
      ? times.filter((slot, index) => times.findIndex(({ time }) => time === slot.time) === index)
      : [{ time: clockLine(Number(placeholderValue), lang).padStart(5, placeholderValue), taken: false }],
    minutes: 30,
  };
}
const plantCareStarts = {
  times: [
    { time: "09:00", taken: false },
    { time: "09:30", taken: true },
    { time: "10:00", taken: false },
    { time: "10:30", taken: false },
    { time: "11:00", taken: true },
    { time: "11:30", taken: false },
  ],
  at: "09:00",
  minutes: 30,
};
export const examples = [
  // Ledge: the same half-hour starts in both layouts for comparison.
  plantCareStarts,
  { ...plantCareStarts, arrange: "rows" },
  // Trot: hour-long dog walks.
  {
    arrange: "rows",
    times: [
      { time: "14:00", taken: false },
      { time: "15:00", taken: true },
      { time: "16:00", taken: false },
    ],
    minutes: 60,
  },
  {
    arrange: "rows",
    times: [
      { time: "00:00", taken: false },
      { time: "23:59", taken: true },
    ],
    at: "00:00",
    minutes: 600,
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Slots");
export const probes = [
  choose("Pick a free start time today, with already taken times disabled"),
  choose("Choose which day next week I want to book", "Calendar"),
  write("Start times 09:00 free and 09:30 taken, thirty minute appointments"),
  {
    ...write(
      "Show a free 14:00 start and a taken 15:00 start for hour-long appointments, one row per start with its end time.",
    ),
    variant: { axis: "arrange", value: "rows" },
  },
  read("Choose the free 09:00 time", { address: "s1/r1", action: "select" }),
  { ...read("Choose the free 16:00 time", { address: "s1/r3", action: "select" }), screen: 2 },
] satisfies Probe[];

export function Slots(input: Props<typeof props, typeof meta>) {
  const { times, at, minutes } = input;
  const arrange = useVariant("arrange", meta.variants.arrange, input.arrange);
  const { lang, words } = useWords(bookingWordsFor);
  const { slotLabels } = words;
  const state = useComponentState();
  const thing = useEmptyThing();
  const duration = durationLine(minutes, lang);
  if (state === "empty") {
    return (
      <KitCard style="inset" part="root">
        <KitEmpty
          icon="clock"
          title={thing ? emptyLine(thing, lang) : slotLabels.empty}
          part="minutes"
          decorativeIcon
        />
      </KitCard>
    );
  }
  const slots = times.map(({ id, time, taken }) => {
    const sub = slotDetailLine(time, minutes, arrange, taken, lang);
    return {
      id,
      taken,
      label: state === "loading" ? slotLoadingLine(time) : time,
      sub: state === "loading" ? slotLoadingLine(sub) : sub,
    };
  });
  const selected = times.find(({ time }) => time === at);
  return (
    <KitCard style="inset" padded part="root">
      <KitSlotGrid
        times={slots}
        {...(selected ? { at: selected.id } : {})}
        style={arrange === "rows" ? "list" : "grid"}
        loading={state === "loading"}
        part="times"
      />
      {state === "loading" ? (
        <KitSkeleton shape="figure" inset="none" content={[["caption", duration]]} />
      ) : (
        <KitText role="caption" tone="muted" tabular part="minutes">
          {duration}
        </KitText>
      )}
    </KitCard>
  );
}

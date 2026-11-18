import { z } from "zod";
import {
  clock,
  clockLine,
  detailOf,
  emptyLine,
  itemsOf,
  placeholderValue,
  probesFor,
  slotDurationLine,
  slotDetailLine,
  slotLabels,
  slotLoadingLine,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import {
  KitCard,
  KitEmpty,
  KitSkeleton,
  KitSlotGrid,
  KitText,
  useComponentState,
  useEmptyThing,
} from "../../../kit";

// Core first: Calendar/week selects dates, not free and taken times within a day.
export const meta = {
  id: "Slots",
  status: "draft",
  group: "input",
  purpose: "Choose a free clock time within an already selected day.",
  pick: "HH:MM start times within one day already chosen: free times selectable, taken times disabled. Not choosing which day or date to book, even next week (Calendar/week); not setting working hours (Availability).",
  writeHints: [
    "Times are unique HH:MM start times. at, when present, must exactly match a free time; omit it if none is selected.",
    "minutes is the appointment length, from 5 to 600. End times in list style are computed, not written.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Free times computed on the device from working hours minus bookings.",
  items: { key: "times", parts: ["root", "time"] },
  parts: ["root", "times", "minutes", "sub"],
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["select"] }, when: { root: { taken: false } } },
  read: (input, state) => {
    if (state !== "filled") return [];
    const { times, minutes, style } = input as z.output<typeof props>;
    return [
      slotDurationLine(minutes),
      ...times.flatMap(({ time, taken }) => [
        `${time}${taken ? ` (${slotLabels.taken})` : ""}`,
        slotDetailLine(time, minutes, style, taken),
      ]),
    ];
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
    times: z
      .array(z.strictObject({ time: clock.meta({ kind: "text" }), taken: z.boolean() }))
      .min(1)
      .max(24),
    at: clock.optional(),
    minutes: z.int().min(5).max(600),
    style: z.enum(["grid", "list"]).default("grid"),
  })
  .refine(({ times, at }) => !at || times.some((slot) => slot.time === at && !slot.taken), { path: ["at"] })
  .refine(({ times }) => new Set(times.map(({ time }) => time)).size === times.length, {
    path: ["times"],
    message: "Each start time must be unique",
  });
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
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
      : [{ time: clockLine(Number(placeholderValue)).padStart(5, placeholderValue), taken: false }],
    minutes: 30,
  };
}
export const examples = [
  // Ledge: half-hour plant-care visits.
  {
    style: "grid",
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
  },
  // Trot: hour-long dog walks.
  {
    style: "list",
    times: [
      { time: "14:00", taken: false },
      { time: "15:00", taken: true },
      { time: "16:00", taken: false },
    ],
    minutes: 60,
  },
  {
    style: "list",
    times: [
      { time: "23:59", taken: true },
      { time: "00:00", taken: false },
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
  read("Choose the free 09:00 time", { address: "s1/r1", action: "select" }),
  { ...read("Choose the free 16:00 time", { address: "s1/r3", action: "select" }), screen: 1 },
] satisfies Probe[];

export function Slots({ times, at, minutes, style }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const thing = useEmptyThing();
  const duration = slotDurationLine(minutes);
  if (state === "empty") {
    return (
      <KitCard style="inset" part="root">
        <KitEmpty
          icon="clock"
          title={slotLabels.empty}
          sub={emptyLine(thing)}
          part="minutes"
          decorativeIcon
        />
      </KitCard>
    );
  }
  const slots = times.map(({ id, time, taken }) => {
    const sub = slotDetailLine(time, minutes, style, taken);
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
        style={style}
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

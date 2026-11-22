import {
  KitCard,
  KitContent,
  KitGrid,
  KitLayoutText,
  KitMetaLine,
  KitRow,
  KitRowGroup,
  KitSlotGrid,
  KitState,
  KitTrail,
  useWords,
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
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import { slotLabelLine } from "../copy";
import { prompt } from "../../../entry/prompt-Slots.generated";

// Core first: Calendar/week selects dates, not free and taken times within a day.
export const meta = {
  id: "Slots",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Free times computed on the device from working hours minus bookings.",
  variants: { arrange: ["grid", "rows"] },
  items: { key: "times", parts: ["root", "time"] },
  parts: ["root", "times", "minutes", "sub", "timezone"],
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["select"] }, when: { root: { taken: false } } },
  select: { prop: "at", value: { field: "time" } },
  read: (input, state, lang?: string): string[] => {
    const { slotLabels } = bookingWordsFor(lang);

    if (state !== "filled") return [];
    const { times, minutes, arrange, style, timezone } = input as z.output<typeof props>;
    return [
      durationLine(minutes, lang),
      ...(timezone ? [timezone] : []),
      ...times.flatMap(({ time, taken }) => [
        slotLabelLine(time, minutes, style ?? arrange, lang),
        taken ? slotLabels.taken : slotLabels.free,
        ...(taken && !style && arrange === "grid" ? [`${time} (${slotLabels.taken})`] : []),
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
    style: z.literal("ranges").optional(),
    timezone: text(32).optional(),
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
  {
    ...plantCareStarts,
    times: [
      { time: "09:00", taken: false },
      { time: "09:45", taken: true },
      { time: "10:30", taken: false },
      { time: "11:15", taken: true },
    ],
    style: "ranges",
    minutes: 45,
    timezone: "New York time",
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
  {
    ...write(
      "Offer a free 09:00 and a taken 10:00 start for 45-minute visits. Show each time as one span, like 09:00–09:45.",
    ),
    expectProps: { style: "ranges" },
  },
  {
    ...write(
      "Offer free 09:00 and taken 10:00 starts for 45-minute visits. Label the times with America/New_York.",
    ),
    expectProps: { timezone: "America/New_York" },
  },
] satisfies Probe[];

function SlotPlaceholders({
  slots,
  list,
  label,
}: {
  slots: readonly { id: string; label: string; sub: string }[];
  list: boolean;
  label: string;
}) {
  const cells = slots.map((slot) => (
    <KitRow key={slot.id} inset="none" label={slot.label}>
      <KitMetaLine
        align={list ? "start" : "center"}
        title={{ text: slot.label, role: "figure", compact: true, tabular: true }}
        meta={{ text: slot.sub }}
      />
    </KitRow>
  ));
  return (
    <KitRow part="times" inline label={label}>
      {list ? <KitRowGroup separators={false}>{cells}</KitRowGroup> : <KitGrid columns={3}>{cells}</KitGrid>}
    </KitRow>
  );
}

export function Slots(input: Props<typeof props, typeof meta>) {
  const { times, at, minutes, timezone } = input;
  const ranges = input.style === "ranges";
  const arrange = useVariant("arrange", meta.variants.arrange, input.arrange);
  const { lang, words } = useWords(bookingWordsFor);
  const { slotLabels } = words;
  const state = useComponentState();
  const thing = useEmptyThing();
  const duration = durationLine(minutes, lang);
  const list = ranges || arrange === "rows";
  const slots = times.map(({ id, time, taken }) => ({
    id,
    taken,
    label: slotLabelLine(time, minutes, input.style ?? arrange, lang),
    sub: taken ? slotLabels.taken : slotLabels.free,
  }));
  const selected = times.find(({ time }) => time === at);
  const body = (
    <>
      {timezone && (
        <KitContent
          leadingAlign="row"
          lead={<KitTrail kind="badge" part="timezone" tone="muted" value={timezone} />}
        >
          {null}
        </KitContent>
      )}
      {state === "loading" ? (
        <SlotPlaceholders slots={slots} list={list} label={duration} />
      ) : (
        <KitSlotGrid
          times={slots}
          {...(selected ? { at: selected.id } : {})}
          style={list ? "list" : "grid"}
          part="times"
        />
      )}
      <KitContent group="response">
        <KitLayoutText
          line={{ text: duration, role: "caption", tone: "muted", tabular: true, part: "minutes" }}
        />
      </KitContent>
    </>
  );
  return (
    <KitCard style="inset" padded={state !== "empty"} part="root">
      <KitState
        part="minutes"
        icon="clock"
        message={thing ? emptyLine(thing, lang) : slotLabels.empty}
        loading={body}
      >
        {body}
      </KitState>
    </KitCard>
  );
}

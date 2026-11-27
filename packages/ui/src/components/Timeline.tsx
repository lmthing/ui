import { z } from "zod";
import {
  probesFor,
  sampleWalks,
  clock,
  detailOf,
  itemsOf,
  itemVariantProps,
  placeholderTitle,
  screenId,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
  type ThemeDensity,
  variantProps,
  wordsFor,
} from "../catalog";
import {
  KitCard,
  KitContent,
  KitEmpty,
  KitHours,
  KitLayoutText,
  KitSkeleton,
  KitTrail,
  KitTrack,
  useComponentState,
  useKit,
  useWords,
} from "../kit";
import { TimelineFlow, type TimelineFlowGroup } from "../kit/timeline";
import { prompt } from "../entry/prompt-Timeline.generated";

export const meta = {
  id: "Timeline",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  weightByStyle: { hours: 3 },
  signatureByStyle: { hours: "day_unfold" },
  tier: "phone",
  realPath: "Time-stamped events or activity start and end times stored on the device.",
  variants: { detail: ["full", "brief"] },
  items: {
    key: "items",
    parts: ["root", "time", "title", "meta", "summary"],
    variants: { tone: ["neutral", "good", "warn", "bad"] },
  },
  variantParts: { "detail.brief": { hides: ["meta"] } },
  parts: ["root", "record", "reference", "state", "current"],
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] }, when: { root: { style: "hours" } } },
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { style, items } = input as z.output<typeof props>;
    if (style === "hours") return items.map(({ time, end }) => `${time}–${end}`);
    return style === "record"
      ? items.flatMap(({ meta }) => (meta ? [wordsFor(lang).timeline.internal(meta)] : []))
      : [];
  },
} as const satisfies Meta;

const event = z.strictObject({
  ...itemVariantProps(meta.items.variants),
  time: text(12),
  title: text(32),
  meta: text(32).optional(),
  summary: text(80).optional(),
  done: z.boolean().default(false),
  end: clock.optional(),
  goto: screenId.optional(),
});

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    style: z.enum(["day", "history", "hours", "record"]).default("day"),
    record: text(48).optional(),
    reference: text(24).optional(),
    current: text(24).optional(),
    audience: z.enum(["summary", "detail"]).optional().meta({ read: false }),
    items: z.array(event).min(1).max(8),
  })
  .refine(
    ({ style, record, reference, current, audience, items }) =>
      style === "record"
        ? Boolean(record && current)
        : !record && !reference && !current && !audience && items.every((item) => item.summary === undefined),
    {
      path: ["style"],
      message: "Only record history uses a record, current status, reference, audience or public summary",
    },
  )
  .refine(({ style, items }) => style === "hours" || items.length <= 6, {
    path: ["items"],
    message: "Day and history take up to six events",
  })
  .refine(
    ({ style, items }) =>
      items.every((item) =>
        style === "hours"
          ? clock.safeParse(item.time).success &&
            item.end !== undefined &&
            item.time < item.end &&
            item.meta === undefined &&
            !item.done
          : item.end === undefined && item.goto === undefined,
      ),
    {
      path: ["items"],
      message: "Hours needs a start and later end in HH:MM; end and goto belong only to hours",
    },
  )
  .overwrite((value) =>
    value.style === "hours"
      ? {
          ...value,
          items: [...value.items]
            .sort((a, b) => a.time.localeCompare(b.time))
            .map((item) => ({ ...item, root: item.goto })),
        }
      : value.detail === "brief" || (value.style === "record" && value.audience !== "detail")
        ? { ...value, items: value.items.map((item) => ({ ...item, meta: undefined })) }
        : value,
  );

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 3).flatMap((item) => {
    const title = titleOf(item, 32, thing),
      detail = detailOf(item, 32, thing);
    return title ? [{ time: "—", title, ...(detail ? { meta: detail } : {}) }] : [];
  });
  return {
    style: "day",
    items: items.length
      ? items
      : [0, 1, 2].map((index) => ({ time: "—", title: placeholderTitle(index, lang) })),
  };
}

const careHours = [
  { time: "09:00", end: "10:00", title: "Water the fern", goto: "fern" },
  { time: "11:00", end: "12:30", title: "Repot basil" },
  { time: "14:00", end: "15:00", title: "Check the orchid" },
];
const dayWalks = sampleWalks.map((walk, index) => (index === 0 ? { ...walk, title: "Park walk" } : walk));

export const examples = [
  {
    style: "history",
    items: [
      { time: "Mon", title: "Watered fern", meta: "Bathroom · Ledge", done: true },
      { time: "Wed", title: "Repotted basil", meta: "Kitchen", done: true },
    ],
  },
  { style: "day", items: dayWalks },
  { style: "hours", items: careHours },
  { items: dayWalks },
  ...(["good", "warn", "bad"] as const).map((tone, status) => ({
    style: "hours" as const,
    items: careHours.map((item, index) =>
      index === 0
        ? { ...item, tone, title: ["Fern watered", "Watering delayed", "Watering blocked"][status]! }
        : item,
    ),
  })),
  {
    style: "record",
    record: "Fern fungus inspection",
    reference: "GH-042",
    current: "Follow-up booked",
    audience: "detail",
    items: [
      {
        time: "Thu 26 Nov",
        title: "Follow-up booked",
        summary: "A gardener will visit tomorrow.",
        meta: "Bench 4 · check new fronds",
      },
      { time: "Wed 25 Nov", title: "Inspection requested", summary: "We received your request." },
    ],
  },
  {
    style: "record",
    record: "Clover's Meadow walk",
    reference: "WK-314",
    current: "Walker assigned",
    items: [
      { time: "Fri 27 Nov", title: "Walker assigned", summary: "Sam will collect Clover at 09:00." },
      { time: "Thu 26 Nov", title: "Request received" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Timeline");
export const probes = [
  choose("Show today's walks in time order: 09:00 park, 12:30 lunch, 17:00 river"),
  choose("Show my plants and let me open one, with no dates or times", "List"),
  choose(
    "Show today's walks from 09:00 to 10:00, 12:00 to 13:30 and 17:00 to 18:00, with their lengths and the free gaps between them",
  ),
  choose("Show a whole month of dates, marking the days when plants need water", "Calendar"),
  choose(
    "For one shipment, show the current state and a dated history of each status change in order, not a route map.",
  ),
  write("Today's walks: Morning park walk at 09:00 already done, Lunch walk at 12:30, River walk at 17:00"),
  write(
    "Saturday plant care by the hour: Water the fern 09:00–10:00, Repot basil 11:00–12:30, Check the orchid 14:00–15:00. Show the free gaps and let me open the fern's screen fern.",
  ),
  {
    ...write(
      "Show today's walks in time order: Park walk at 09:00 and River walk at 17:00. On screen, show only the time and title for each; hide their meetup notes.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the fern scheduled for watering", { address: "t1/r1", action: "press" }, 2),
  {
    ...write(
      "Show the state changes of record GH-042, Fern fungus inspection. It's currently Follow-up booked. Thu 26 Nov: Follow-up booked, public summary A gardener will visit tomorrow. Only show the public summary.",
    ),
    expectProps: { style: "record", current: "Follow-up booked" },
  },
] satisfies Probe[];

type TimelineProps = Props<typeof props, typeof meta>;

function TimelineEvents({
  items,
  density,
  record,
}: Pick<TimelineProps, "items"> & { density: ThemeDensity; record: boolean }) {
  const { timeline } = useWords().words;
  const group: TimelineFlowGroup = {
    rows: items.map((item) => ({
      kind: "event",
      item: item.id,
      tone: item.tone,
      inlineTime: record,
      slots: {
        title: { part: "title", text: item.title },
        time: { part: "time", text: item.time },
        ...(item.summary ? { summary: { part: "summary", text: item.summary } } : {}),
        ...(item.meta
          ? { detail: { part: "meta", text: record ? timeline.internal(item.meta) : item.meta } }
          : {}),
        done: item.done,
      },
    })),
  };
  return <TimelineFlow groups={[group]} density={density} />;
}

export function Timeline({ style, items, record, reference, current }: TimelineProps) {
  const state = useComponentState();
  const density = useKit().density;
  const hours = style === "hours";
  const recordHistory = style === "record";
  return (
    <KitCard
      style="inset"
      part="root"
      density={density}
      padded={state !== "empty" && (hours || recordHistory)}
    >
      {recordHistory && state !== "empty" && (
        <KitContent rhythm="flush" density={density}>
          <KitLayoutText line={{ text: record, part: "record", strong: true }} />
          <KitLayoutText line={{ text: reference, part: "reference", role: "meta", tone: "muted" }} />
          {current && (
            <KitTrack part="state">
              <KitTrail part="current" kind="badge" value={current} inline />
            </KitTrack>
          )}
        </KitContent>
      )}
      {state === "loading" ? (
        <KitSkeleton rows={items.length} lead="time" items={items} density={density} />
      ) : state === "empty" ? (
        <KitEmpty part="title" />
      ) : hours ? (
        <KitHours
          blocks={items.map(({ id, time, end, title, tone, goto }) => ({
            id,
            start: time,
            end: end!,
            title,
            tone,
            ...(goto ? { goto } : {}),
          }))}
        />
      ) : (
        <TimelineEvents {...{ items, density }} record={recordHistory} />
      )}
    </KitCard>
  );
}

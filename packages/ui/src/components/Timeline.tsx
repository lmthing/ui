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
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import {
  KitCard,
  KitEmpty,
  KitHours,
  KitIcon,
  KitRow,
  KitSkeleton,
  KitText,
  KitTime,
  useComponentState,
  useVariant,
} from "../kit";

export const meta = {
  id: "Timeline",
  group: "data",
  purpose: "Events in time order, or activities sized by duration on an hour rail.",
  pick: "Dated or timed events in order. Use hours when start/end times, duration and free gaps matter. Not choosing dates (Calendar), things without times to browse (List), or independent jobs (Checklist).",
  writeHints: [
    "Use day for a schedule of events with only single times, even if some are already done. Use history for an explicitly past-only log. Either takes up to six items. To show time and title only, set detail brief and keep supplied notes in meta.",
    "Use hours for duration blocks on an hour rail: up to eight items, time as the start in HH:MM and a later end in HH:MM. Only hours uses end and goto; omit meta and done in hours.",
    "Set density, detail and each event tone to null unless explicitly requested. Times, notes, completion and scheduling are data, not requests for a variant.",
  ],
  region: "body",
  weight: 2,
  weightByStyle: { hours: 3 },
  signatureByStyle: { hours: "day_unfold" },
  tier: "phone",
  realPath: "Time-stamped events or activity start and end times stored on the device.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  items: {
    key: "items",
    parts: ["root", "time", "title", "meta"],
    variants: { tone: ["neutral", "good", "warn", "bad"] },
  },
  variantParts: { "detail.brief": { hides: ["meta"] } },
  parts: ["root"],
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] }, when: { root: { style: "hours" } } },
  read: (input, state) =>
    state === "filled" && (input as { style: string }).style === "hours"
      ? (input as { items: { time: string; end: string }[] }).items.map((item) => `${item.time}–${item.end}`)
      : [],
} as const satisfies Meta;

const event = z.strictObject({
  ...itemVariantProps(meta.items.variants),
  time: text(12),
  title: text(32),
  meta: text(32).optional(),
  done: z.boolean().default(false),
  end: clock.optional(),
  goto: screenId.optional(),
});

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    style: z.enum(["day", "history", "hours"]).default("day"),
    items: z.array(event).min(1).max(8),
  })
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
      : value.detail === "brief"
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

export const examples = [
  {
    style: "history",
    items: [
      { time: "Mon", title: "Watered fern", meta: "Bathroom · Ledge", done: true },
      { time: "Wed", title: "Repotted basil", meta: "Kitchen", done: true },
    ],
  },
  {
    style: "day",
    items: sampleWalks,
  },
  {
    style: "hours",
    items: [
      { time: "09:00", end: "10:00", title: "Water the fern", tone: "good", goto: "fern" },
      { time: "11:00", end: "12:30", title: "Repot basil", tone: "warn" },
      { time: "14:00", end: "15:00", title: "Check the orchid", tone: "bad" },
    ],
  },
  { density: "compact", items: sampleWalks },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Timeline");
export const probes = [
  choose("Show today's walks in time order: 09:00 park, 12:30 lunch, 17:00 river"),
  choose("Show my plants and let me open one, with no dates or times", "List"),
  choose(
    "Show today's walks from 09:00 to 10:00, 12:00 to 13:30 and 17:00 to 18:00, with their lengths and the free gaps between them",
  ),
  choose("Show a whole month of dates, marking the days when plants need water", "Calendar"),
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
] satisfies Probe[];

type TimelineProps = Props<typeof props, typeof meta>;

// prettier-ignore
function Events({ style, items, density }: Pick<TimelineProps, "style" | "items" | "density">) {
  return items.map((item) => {
    const complete = style === "history" && item.done;
    return <KitRow key={item.id} item={item.id} label={item.title} tone={item.tone} density={density}
      leading={<KitTime value={item.time} part="time" />}
      trailing={complete ? <KitIcon name="check" decorative /> : undefined}>
      <KitText role="body" tone={complete ? "muted" : "text"} part="title" density={density}>{item.title}</KitText>
      {item.meta && <KitText role="caption" tone="muted" part="meta" density={density}>{item.meta}</KitText>}
    </KitRow>;
  });
}

// prettier-ignore
export function Timeline({ style, items, density: requested }: TimelineProps) {
  const state = useComponentState();
  const density = useVariant("density", meta.variants.density, requested);
  const hours = style === "hours";
  return <KitCard style="inset" part="root" density={density} padded={state === "filled" && hours}>
    {state === "loading" ? <KitSkeleton rows={items.length} lead="time" items={items} density={density} /> :
      state === "empty" ? <KitEmpty part="title" /> :
      hours ? <KitHours blocks={items.map(({ id, time, end, title, tone, goto }) => ({
        id, start: time, end: end!, title, tone, ...(goto ? { goto } : {}),
      }))} /> : <Events {...{ items, style, density }} />}
  </KitCard>;
}

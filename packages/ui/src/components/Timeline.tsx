import { z } from "zod";
import {
  clock,
  detailOf,
  itemsOf,
  placeholderTitle,
  screenId,
  text,
  thingOf,
  titleOf,
  type CastLike,
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
} from "../kit";

export const meta = {
  id: "Timeline",
  group: "data",
  purpose: "Events in time order, or activities sized by duration on an hour rail.",
  pick: "Dated or timed events in order. Use hours when start/end times, duration and free gaps matter. Not choosing dates (Calendar), things without times to browse (List), or independent jobs (Checklist).",
  writeHints: [
    "Use day or history for up to six events with time and title, optionally meta and done.",
    "Use hours for duration blocks on an hour rail: up to eight items, time as the start in HH:MM and a later end in HH:MM. Only hours uses end, tone and goto; omit meta and done in hours.",
    'Example hours: {"style":"hours","items":[{"time":"09:00","end":"10:00","title":"Water the fern","goto":"fern"},{"time":"11:00","end":"12:30","title":"Repot basil","tone":"warn"}]}.',
  ],
  region: "body",
  weight: 2,
  weightByStyle: { hours: 3 },
  signatureByStyle: { hours: "day_unfold" },
  tier: "phone",
  realPath: "Time-stamped events or activity start and end times stored on the device.",
  items: { key: "items", parts: ["root", "time", "title", "meta"] },
  parts: ["root"],
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] }, when: { root: { style: "hours" } } },
  aliases: ["agenda", "history", "dayplan", "timeblocks", "hourly"],
  read: (input, state) =>
    state === "filled" && (input as { style: string }).style === "hours"
      ? (input as { items: { time: string; end: string }[] }).items.map((item) => `${item.time}–${item.end}`)
      : [],
} as const satisfies Meta;

export const props = z
  .strictObject({
    style: z.enum(["day", "history", "hours"]).default("day"),
    items: z
      .array(
        z.strictObject({
          time: text(12),
          title: text(32),
          meta: text(32).optional(),
          done: z.boolean().default(false),
          end: clock.optional(),
          tone: z.enum(["neutral", "good", "warn", "bad"]).optional(),
          goto: screenId.optional(),
        }),
      )
      .min(1)
      .max(8),
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
          : item.end === undefined && item.tone === undefined && item.goto === undefined,
      ),
    {
      path: ["items"],
      message: "Hours needs a start and later end in HH:MM; end, tone and goto belong only to hours",
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
      : value,
  );

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 3).flatMap((item) => {
    const title = titleOf(item, 32, thing),
      detail = detailOf(item, 32, thing);
    return title ? [{ time: "—", title, ...(detail ? { meta: detail } : {}) }] : [];
  });
  return {
    style: "day",
    items: items.length ? items : [0, 1, 2].map((index) => ({ time: "—", title: placeholderTitle(index) })),
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
    items: [
      { time: "09:00", title: "Morning park walk", done: true },
      { time: "12:30", title: "Lunch walk" },
      { time: "17:00", title: "River walk" },
    ],
  },
  {
    style: "hours",
    items: [
      { time: "09:00", end: "10:00", title: "Water the fern", tone: "good", goto: "fern" },
      { time: "11:00", end: "12:30", title: "Repot basil", tone: "warn" },
      { time: "14:00", end: "15:00", title: "Check the orchid", tone: "bad" },
    ],
  },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "Show today's walks in time order: 09:00 park, 12:30 lunch, 17:00 river",
    expect: "Timeline",
  },
  { kind: "choose", need: "Show my plants and let me open one, with no dates or times", expect: "List" },
  {
    kind: "choose",
    need: "Show today's walks from 09:00 to 10:00, 12:00 to 13:30 and 17:00 to 18:00, with their lengths and the free gaps between them",
    expect: "Timeline",
  },
  {
    kind: "choose",
    need: "Show a whole month of dates, marking the days when plants need water",
    expect: "Calendar",
  },
  {
    kind: "write",
    brief: "Today's walks: Morning park walk at 09:00 already done, Lunch walk at 12:30, River walk at 17:00",
    expect: "Timeline",
  },
  {
    kind: "write",
    brief:
      "Saturday plant care by the hour: Water the fern 09:00–10:00, Repot basil 11:00–12:30, Check the orchid 14:00–15:00. Show the free gaps and let me open the fern's screen fern.",
    expect: "Timeline",
  },
  {
    kind: "read",
    screen: 2,
    task: "Open the fern scheduled for watering",
    expect: { address: "t1/r1", action: "press" },
  },
] satisfies Probe[];

export function Timeline({ style, items }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  if (state === "loading" || state === "empty")
    return (
      <KitCard style="inset" part="root">
        {state === "loading" ? <KitSkeleton rows={items.length} lead="box" /> : <KitEmpty part="title" />}
      </KitCard>
    );
  if (style === "hours")
    return (
      <KitCard style="inset" part="root" padded>
        <KitHours
          blocks={items.map((item) => ({
            id: item.id,
            start: item.time,
            end: item.end!,
            title: item.title,
            tone: item.tone ?? "neutral",
            ...(item.goto ? { goto: item.goto } : {}),
          }))}
        />
      </KitCard>
    );
  return (
    <KitCard style="inset" part="root">
      {items.map((item) => (
        <KitRow
          key={item.id}
          item={item.id}
          label={item.title}
          leading={<KitTime value={item.time} part="time" />}
          trailing={style === "history" && item.done ? <KitIcon name="check" decorative /> : undefined}
        >
          <KitText role="body" tone={style === "history" && item.done ? "muted" : "text"} part="title">
            {item.title}
          </KitText>
          {item.meta && (
            <KitText role="caption" tone="muted" part="meta">
              {item.meta}
            </KitText>
          )}
        </KitRow>
      ))}
    </KitCard>
  );
}

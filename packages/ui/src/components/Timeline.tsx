import { z } from "zod";
import {
  detailOf,
  itemsOf,
  placeholderTitle,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitCard, KitEmpty, KitIcon, KitRow, KitSkeleton, KitText, KitTime, useComponentState } from "../kit";

export const meta = {
  id: "Timeline",
  group: "data",
  purpose: "When things happen, in time order, as a day plan or a history.",
  pick: "Show events with their times or dates in order. Not things without times to browse (List) or independent jobs to tick off (Checklist).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Time-stamped events stored and ordered in the on-device database.",
  items: { key: "items", parts: ["root", "time", "title", "meta"] },
  parts: ["root"],
  states: ["filled", "empty", "loading"],
  aliases: ["chronology", "agenda", "history"],
} as const satisfies Meta;

export const props = z.strictObject({
  style: z.enum(["day", "history"]).default("day"),
  items: z
    .array(
      z.strictObject({
        time: text(12),
        title: text(32),
        meta: text(32).optional(),
        done: z.boolean().default(false),
      }),
    )
    .min(1)
    .max(6),
});

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 3).flatMap((item) => {
    const title = titleOf(item, 32, thing);
    const detail = detailOf(item, 32, thing);
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
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "Show today's walks in time order: 09:00 park, 12:30 lunch, 17:00 river",
    expect: "Timeline",
  },
  { kind: "choose", need: "Show my plants and let me open one, with no dates or times", expect: "List" },
  {
    kind: "write",
    brief: "Today's walks: Morning park walk at 09:00 already done, Lunch walk at 12:30, River walk at 17:00",
    expect: "Timeline",
  },
] satisfies Probe[];

export function Timeline({ style, items }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  if (state === "loading") {
    return (
      <KitCard style="inset" part="root">
        <KitSkeleton rows={items.length} lead="box" />
      </KitCard>
    );
  }
  if (state === "empty") {
    return (
      <KitCard style="inset" part="root">
        <KitEmpty part="title" />
      </KitCard>
    );
  }
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

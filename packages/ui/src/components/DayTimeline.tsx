import { z } from "zod";
import {
  emptyLine,
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
import { KitCard, KitHours, KitText, useComponentState, useEmptyThing } from "../kit";

export const meta = {
  id: "DayTimeline",
  group: "data",
  purpose: "Plan a day's occupied time and see how long activities last and where gaps remain.",
  pick: "A single day's activities with start and end times, duration-sized blocks and visible free gaps by the hour. Not point-in-time events or dated history (Timeline), or choosing dates across a week or month (Calendar).",
  region: "body",
  weight: 3,
  tier: "phone",
  realPath: "Start and end times for a day's activities stored in the on-device database.",
  items: { key: "blocks", parts: ["root", "time", "title"] },
  parts: ["root"],
  states: ["filled", "empty"],
  actions: { items: { root: ["press"] } },
  aliases: ["dayplan", "timeblocks", "hourly", "daily"],
  read: (input: unknown) =>
    (input as { blocks: { start: string; end: string }[] }).blocks.map(
      (block) => `${block.start}–${block.end}`,
    ),
} as const satisfies Meta;

const time = text(5).refine((value) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value), "Use HH:MM");

export const props = z.strictObject({
  blocks: z
    .array(
      z
        .strictObject({
          start: time,
          end: time,
          title: text(32),
          tone: z.enum(["neutral", "good", "warn", "bad"]).default("neutral"),
          goto: screenId.optional(),
        })
        .refine((block) => block.start < block.end, { path: ["end"], message: "End follows start" })
        // Like List, the shared reader offers a root press only for a linked item.
        .transform(({ goto, ...block }) => ({ ...block, ...(goto ? { goto } : {}), root: goto })),
    )
    .min(1)
    .max(8)
    .transform((blocks) => blocks.sort((a, b) => a.start.localeCompare(b.start))),
});

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const item = itemsOf(cast, 1)[0];
  const title = (item && titleOf(item, 32, thing)) || placeholderTitle(0);
  return { blocks: [{ start: "09:00", end: "10:00", title }] };
}

export const examples = [
  {
    blocks: [
      { start: "09:00", end: "10:00", title: "Water the fern", tone: "good", goto: "fern" },
      { start: "11:00", end: "12:30", title: "Repot basil", tone: "warn" },
      { start: "14:00", end: "15:00", title: "Check the orchid", tone: "bad" },
    ],
  },
  {
    blocks: [
      { start: "09:00", end: "10:00", title: "Morning park walk", goto: "morning_walk" },
      { start: "12:00", end: "13:30", title: "Lunch walk", tone: "good" },
      { start: "17:00", end: "18:00", title: "River walk", tone: "neutral", goto: "river_walk" },
    ],
  },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "Show today's walks from 09:00 to 10:00, 12:00 to 13:30 and 17:00 to 18:00, with their lengths and the free gaps between them",
    expect: "DayTimeline",
  },
  {
    kind: "choose",
    need: "Show a dated history of plant care: watered Monday, repotted Wednesday, checked Friday",
    expect: "Timeline",
  },
  {
    kind: "write",
    brief:
      "Saturday plant care by the hour: Water the fern 09:00–10:00, Repot basil 11:00–12:30, Check the orchid 14:00–15:00. Show the free gaps and let me open the fern's screen fern.",
    expect: "DayTimeline",
  },
  {
    kind: "read",
    screen: 0,
    task: "Open the fern scheduled for watering",
    expect: { address: "d1/r1", action: "press" },
  },
] satisfies Probe[];

export function DayTimeline({ blocks }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const thing = useEmptyThing();
  return (
    <KitCard style="inset" part="root" padded>
      {state === "empty" ? (
        <KitText role="body" tone="muted">
          {emptyLine(thing)}
        </KitText>
      ) : (
        <KitHours blocks={blocks} />
      )}
    </KitCard>
  );
}

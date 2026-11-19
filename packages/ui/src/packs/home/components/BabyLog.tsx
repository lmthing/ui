import { z } from "zod";
import {
  clock,
  itemsOf,
  probesFor,
  text,
  textsOf,
  thingOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import {
  KitCard,
  KitContent,
  KitEmpty,
  KitGrid,
  KitRow,
  KitText,
  KitTile,
  KitTime,
  useComponentState,
} from "../../../kit";
import { babyCopy, babyLabels, babyRead } from "../copy";

// Core first: Timer/down times one task, not feed/nappy/sleep tiles and a baby's daily log.
export const meta = {
  id: "BabyLog",
  status: "ready",
  group: "input",
  purpose: "Quickly log a baby's feeds, nappies and sleeps and time an active feed or sleep.",
  pick: "Baby feeds, nappies and sleeps with quick tiles, an active timer and today's log. Not timing one thing (Timer), adult habits (HabitGrid), or a general care history (Timeline).",
  writeHints: [
    "log has 0–12 entries. Write kind, HH:MM time and optional minutes/amount; never time-since-last. running is none or one kind, not a boolean.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Baby entries and running timers stay on the device; two parents sharing need a shared app.",
  items: { key: "entries", parts: ["root", "kind", "time", "minutes", "amount", "icon", "label"] },
  parts: ["root", "running", "elapsed", "heading", "empty"],
  states: ["filled", "empty"],
  actions: {
    items: { root: ["start", "stop", "press"] },
    when: {
      "root.start": { entryKind: "tile", active: false },
      "root.stop": { entryKind: "tile", active: true },
      "root.press": { entryKind: "log" },
    },
  },
  read: (input, state) => (state === "filled" ? babyRead(input as z.output<typeof props>) : []),
} as const satisfies Meta;
const kinds = ["feed_left", "feed_right", "bottle", "nappy", "sleep"] as const;
const logLimit = 12;
const entry = z.strictObject({
  kind: z.enum(kinds),
  time: clock,
  minutes: z.number().min(0).optional(),
  amount: text(10).optional(),
});
const schema = z.strictObject({
  log: z.array(entry).min(0).max(logLimit),
  running: z.enum(["none", ...kinds]).default("none"),
});
const withEntries = (value: z.output<typeof schema>) => ({
  ...value,
  entries: [
    ...kinds.map((kind) => ({
      kind,
      entryKind: "tile" as const,
      active: value.running === kind,
      last: value.log
        .filter((row) => row.kind === kind)
        .map((row) => row.time)
        .sort()
        .at(-1),
    })),
    ...value.log.map((row) => ({ ...row, entryKind: "log" as const })),
  ],
});
export const props = schema.overwrite(withEntries) as typeof schema &
  z.ZodType<ReturnType<typeof withEntries>, z.input<typeof schema>>;

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const log = itemsOf(cast, logLimit).flatMap((item) => {
    const values = textsOf(item, thing);
    const kind = kinds.find((key) =>
      [item.type, ...values].some((value) => value === key || value === babyLabels[key]),
    );
    const time = values.find((value) => clock.safeParse(value).success);
    return kind && time ? [{ kind, time }] : [];
  });
  return { log, running: "none" };
}
export const examples = [
  {
    log: [
      { kind: "feed_left", time: "07:30", minutes: 12 },
      { kind: "nappy", time: "08:00" },
      { kind: "bottle", time: "09:00", amount: "90 ml" },
    ],
    running: "sleep",
  },
  {
    log: [
      { kind: "feed_right", time: "06:45", minutes: 10 },
      { kind: "sleep", time: "07:00", minutes: 45 },
    ],
    running: "none",
  },
  { log: [], running: "none" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("BabyLog");
export const probes = [
  choose("Quick baby feeding, nappy and sleep tiles, a running feed or sleep timer and today's log"),
  choose("Count down five minutes for one task, no baby log or quick-entry tiles", "Timer"),
  write(
    "Baby fed left at 07:30 for twelve minutes, nappy at 08:00, bottle at 09:00 with 90 ml, sleep is currently running",
  ),
  read("Stop the baby's running sleep timer", { address: "b1/r5", action: "stop" }),
  read("Start a left-side feed", { address: "b1/r1", action: "start" }),
  read("Open the feed recorded at 07:30", { address: "b1/r6", action: "press" }),
] satisfies Probe[];

type BabyLogProps = Props<typeof props, typeof meta>;

function BabyLogRow(row: Extract<BabyLogProps["entries"][number], { entryKind: "log" }>) {
  return (
    <KitRow
      item={row.id}
      label={babyCopy.entry(row)}
      role="button"
      lineRole="label"
      inline
      leading={<KitTime value={row.time} />}
    >
      <KitText role="label" part="kind" children={babyLabels[row.kind]} />
      {row.minutes !== undefined && <BabyNote part="minutes" text={babyCopy.duration(row.minutes)} />}
      {row.amount && <BabyNote part="amount" text={row.amount} />}
    </KitRow>
  );
}

function BabyNote({ text, part = null }: { text: string; part?: string | null }) {
  return (
    <KitText role="caption" tone="muted" align={part ? "start" : "center"} part={part} children={text} />
  );
}

export function BabyLog({ entries, running }: BabyLogProps) {
  if (useComponentState() === "empty") {
    return (
      <KitCard part="root">
        <KitEmpty part="empty" icon="clock" decorativeIcon />
      </KitCard>
    );
  }
  const log = entries.filter((row) => row.entryKind === "log");
  return (
    <KitCard part="root" padded>
      <KitGrid columns={3}>
        {entries
          .filter((row) => row.entryKind === "tile")
          .map((row) => (
            <KitTile
              key={row.id}
              item={row.id}
              icon={babyCopy.icons[row.kind]}
              label={babyLabels[row.kind]}
              on={row.active}
              action={row.active ? "stop" : "start"}
              detail={
                <>
                  <BabyNote text={babyCopy.action(row.active)} />
                  {row.last && <BabyNote text={babyCopy.last(row.last)} />}
                </>
              }
            />
          ))}
        <KitContent>
          <BabyNote part="running" text={babyCopy.running(running)} />
          {running !== "none" && (
            <KitText role="number" tone="accent" tabular part="elapsed" children={babyCopy.clock} />
          )}
        </KitContent>
      </KitGrid>
      <KitContent group="response">
        <KitText role="label" tone="muted" part="heading" children={babyCopy.title} />
        {log.length ? (
          log.map((row) => <BabyLogRow key={row.id} {...row} />)
        ) : (
          <KitText role="caption" tone="muted" part="empty" children={babyCopy.empty} />
        )}
      </KitContent>
    </KitCard>
  );
}

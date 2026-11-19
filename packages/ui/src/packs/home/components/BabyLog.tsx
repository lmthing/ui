import { z } from "zod";
import { clock, itemsOf, probesFor, text, textsOf, thingOf } from "../../../catalog";
import type { FallbackInput, Meta, Probe, Props } from "../../../catalog";
import {
  KitAction,
  KitCard,
  KitContent,
  KitEmpty,
  KitGrid,
  KitRow,
  KitText,
  KitTime,
  KitTrail,
  PartScope,
  useComponentState,
  usePartContext,
  useWords,
} from "../../../kit";
import { babyCopyFor, babyRead } from "../copy";
import { homeWordsFor } from "../lang";
// Core first: Timer/down times one task, not feed/nappy/sleep tiles and a baby's daily log.
const itemParts = ["root", "kind", "time", "minutes", "amount", "label", "root_label", "trail"] as const;
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
  items: { key: "entries", parts: itemParts },
  parts: ["root", "running", "elapsed", "heading", "history", "actions", "empty"],
  states: ["filled", "empty"],
  actions: {
    items: { root: ["start", "stop", "press"] },
    when: {
      "root.start": { entryKind: "tile", active: false },
      "root.stop": { entryKind: "tile", active: true },
      "root.press": { entryKind: "log" },
    },
  },
  read: (input, state, lang?: string) =>
    state === "filled" ? readWithLastTimes(input as z.output<typeof props>, lang) : [],
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
      last: value.log.reduce<string | undefined>(
        (last, row) => (row.kind === kind && (!last || row.time > last) ? row.time : last),
        undefined,
      ),
    })),
    ...value.log.map((row) => ({ ...row, entryKind: "log" as const })),
  ],
});
export const props = schema.overwrite(withEntries) as typeof schema &
  z.ZodType<ReturnType<typeof withEntries>, z.input<typeof schema>>;
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { babyLabels } = homeWordsFor(lang);
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
// prettier-ignore
export const examples = [
  { log: [
    { kind: "feed_left", time: "07:30", minutes: 12 },
    { kind: "nappy", time: "08:00" },
    { kind: "bottle", time: "09:00", amount: "90 ml" },
  ], running: "sleep" },
  { log: [
    { kind: "feed_right", time: "06:45", minutes: 10 },
    { kind: "sleep", time: "07:00", minutes: 45 },
  ], running: "none" },
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
function readWithLastTimes(input: z.output<typeof props>, lang?: string) {
  const absent = ` · ${homeWordsFor(lang).babyLog.last()}`;
  const count = kinds.length + (input.running === "none" ? 1 : 2);
  return babyRead(input, lang).map((line, index) =>
    index < count && line.endsWith(absent) ? line.slice(0, -absent.length) : line,
  );
}
function BabyLogRow(row: Extract<BabyLogProps["entries"][number], { entryKind: "log" }>) {
  const { lang } = useWords(homeWordsFor);
  const copy = babyCopyFor(lang);
  const minutes = row.minutes === undefined ? null : copy.duration(row.minutes);
  const trail = (
    <>
      <KitTime value={row.time} />
      <KitTrail kind="chevron" />
    </>
  );
  return (
    <KitRow item={row.id} label={copy.entry(row)} role="button" lineRole="number" trailing={trail}>
      <KitText role="label" part="kind" children={copy.labels[row.kind]} />
      {(minutes || row.amount) && (
        <KitText {...value} part={null}>
          {minutes && <KitText {...value} part="minutes" children={minutes} />}
          {minutes && row.amount && " "}
          {row.amount && <KitText {...value} part="amount" children={row.amount} />}
        </KitText>
      )}
    </KitRow>
  );
}
const value = { role: "number", numberScale: "compact", tabular: true } as const;
const muted = { role: "label", tone: "muted" } as const;
function BabyQuickAction(row: Extract<BabyLogProps["entries"][number], { entryKind: "tile" }>) {
  const context = usePartContext();
  const { lang } = useWords(homeWordsFor);
  const copy = babyCopyFor(lang);
  const kind = row.active ? "primary" : "quiet";
  const action = row.active ? "stop" : "start";
  return (
    <PartScope {...context} item={row.id}>
      <KitGrid fitLast>
        <KitContent inset="md">
          <KitText role="label" part="label" children={copy.labels[row.kind]} />
          {row.last && <KitText {...muted} part={null} children={copy.last(row.last)} />}
        </KitContent>
        <KitAction label={copy.action(row.active)} {...{ kind, action }} />
      </KitGrid>
    </PartScope>
  );
}
export function BabyLog({ entries, running }: BabyLogProps) {
  const { lang } = useWords(homeWordsFor);
  const copy = babyCopyFor(lang);
  if (useComponentState() === "empty")
    return <KitCard part="root" children={<KitEmpty part="empty" icon="clock" decorativeIcon />} />;
  const log = entries
    .filter((row) => row.entryKind === "log")
    .map((row) => <BabyLogRow key={row.id} {...row} />);
  const tiles = entries
    .filter((row) => row.entryKind === "tile")
    .map((row) => <BabyQuickAction key={row.id} {...row} />);
  const empty = <KitText {...muted} part="empty" children={copy.empty} />;
  const history = log.length ? log : <KitContent inset="md" children={empty} />;
  return (
    <KitCard part="root" padded>
      <KitContent>
        <KitGrid fitLast>
          <KitContent inset="md" children={<KitText role="heading" part="heading" children={copy.title} />} />
          <KitContent>
            <KitText {...muted} align="end" part="running" children={copy.running(running)} />
            {running !== "none" && (
              <KitText {...value} align="end" tone="accent" part="elapsed" children={copy.clock} />
            )}
          </KitContent>
        </KitGrid>
        <KitCard part="actions" style="cards" children={tiles} />
        <KitContent group="response">
          <KitCard part="history" style="cards" label={copy.history} children={history} />
        </KitContent>
      </KitContent>
    </KitCard>
  );
}

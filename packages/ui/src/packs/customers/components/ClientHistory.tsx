import { z } from "zod";
import {
  changeLine,
  historyDetailLine,
  isoDate,
  itemsOf,
  placeholderTitle,
  probesFor,
  screenId,
  text,
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
  KitIcon,
  KitRow,
  KitSkeleton,
  KitText,
  KitTrail,
  useComponentState,
} from "../../../kit";

// Core first: Timeline/history cannot distinguish client visits, orders, payments and notes with numeric amounts.
export const meta = {
  id: "ClientHistory",
  status: "ready",
  group: "data",
  purpose: "Recall one client's visits, orders, payments, notes and messages together.",
  pick: "One client's past events across visits, orders, payments, notes and messages, newest first. Not a plan in time order (Timeline), personal banking (Transactions), or staff changes (ActivityLog).",
  writeHints: ["Write entries newest first. Amounts are numeric records, never currency text."],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Records linked to one client on the device.",
  items: { key: "entries", parts: ["root", "date", "kind", "title", "amount"] },
  parts: ["root", "empty"],
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] } },
  read: (input, state) =>
    state !== "filled"
      ? []
      : (input as z.output<typeof props>).entries.flatMap((entry) => [
          historyDetailLine(entry.kind, entry.date),
          ...(entry.amount === undefined ? [] : [changeLine(entry.amount, "money")]),
        ]),
} as const satisfies Meta;
export const props = z
  .strictObject({
    entries: z
      .array(
        z.strictObject({
          date: isoDate,
          kind: z.enum(["visit", "order", "payment", "note", "message"]).meta({ kind: "text" }),
          title: text(32),
          amount: z.number().optional(),
          goto: screenId,
        }),
      )
      .min(1)
      .max(6),
  })
  .refine(
    ({ entries }) => entries.every((entry, index) => !index || entries[index - 1]!.date >= entry.date),
    {
      path: ["entries"],
      message: "Write newest first",
    },
  );
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const entries = itemsOf(cast, 3).map((item) => ({
    date: "2026-11-18",
    kind: "note" as const,
    title: titleOf(item, 32, thing) || placeholderTitle(0),
    goto: "details",
  }));
  return {
    entries: entries.length
      ? entries
      : [{ date: "2026-11-18", kind: "note", title: placeholderTitle(0), goto: "details" }],
  };
}
export const examples = [
  {
    entries: [
      { date: "2026-11-18", kind: "visit", title: "Watering and leaf care", goto: "visit" },
      { date: "2026-11-17", kind: "order", title: "Repotting supplies", amount: 20, goto: "order" },
      { date: "2026-11-16", kind: "note", title: "Spare key at reception", goto: "notes" },
    ],
  },
  {
    entries: [
      { date: "2026-11-18", kind: "payment", title: "October walks paid", amount: 120, goto: "payment" },
      { date: "2026-11-17", kind: "message", title: "Clover's pickup set", goto: "messages" },
    ],
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("ClientHistory");
export const probes = [
  choose(
    "Show one customer's past visits, orders, payments and notes together, with amounts where money moved",
  ),
  choose("Show today's planned visits in time order with start and end times", "Timeline"),
  write(
    "Ben's newest history: payment of 120 on 2026-11-18 opening payment, park walk on 2026-11-17 opening visit",
  ),
  read("Open the watering and leaf care visit", { address: "c1/r1", action: "press" }),
] satisfies Probe[];

const kindIcons = {
  visit: "calendar",
  order: "shopping_bag",
  payment: "banknote",
  note: "file_text",
  message: "message",
} as const;

export function ClientHistory({ entries }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  return (
    <KitCard style="inset" part="root">
      {state === "empty" ? (
        <KitEmpty decorativeIcon part="empty" />
      ) : state === "loading" ? (
        <KitSkeleton
          rows={entries.length}
          lead="dot"
          items={entries.map((entry) => ({
            title: entry.title,
            meta: historyDetailLine(entry.kind, entry.date),
            trail: true,
          }))}
        />
      ) : (
        entries.map((entry) => (
          <KitRow
            key={entry.id}
            item={entry.id}
            label={entry.title}
            goto={entry.goto}
            leading={<KitIcon name={kindIcons[entry.kind]} part="kind" />}
            trailing={
              entry.amount === undefined ? (
                <KitIcon name="chevron_right" decorative />
              ) : (
                <KitTrail kind="value" value={changeLine(entry.amount, "money")} part="amount" />
              )
            }
          >
            <KitText part="title">{entry.title}</KitText>
            <KitText role="caption" tone="muted" part="date">
              {historyDetailLine(entry.kind, entry.date)}
            </KitText>
          </KitRow>
        ))
      )}
    </KitCard>
  );
}

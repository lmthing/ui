// prettier-ignore
import { useWords, KitCard, KitEmpty, KitIcon, KitRow, KitSkeleton, KitText, KitTrail, useComponentState, useVariant } from "../../../kit";
// prettier-ignore
import { wordsFor, changeLine, isoDate, itemVariantProps, itemsOf, placeholderTitle, probesFor, screenId, text, thingOf, titleOf, variantProps, type FallbackInput, type Meta, type Probe, type Props } from "../../../catalog";
import { z } from "zod";

// Core first: Timeline/history cannot distinguish client visits, orders, payments and notes with numeric amounts.
export const meta = {
  id: "ClientHistory",
  status: "ready",
  group: "data",
  purpose: "Recall one client's visits, orders, payments, notes and messages together.",
  pick: "One client's past events across visits, orders, payments, notes and messages, newest first. Not a plan in time order (Timeline), personal banking (Transactions), or staff changes (ActivityLog).",
  writeHints: [
    "Write entries newest first. Amounts are numeric records, never currency text.",
    'If asked only to hide the icons, use {"density":null,"surface":null,"lead":"none"}; keep each event kind and date and set each row tone and mark to null.',
    "Ordinary visits, orders and payments do not request a row tone or mark. When asked to highlight, mark at most one in three rows.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Records linked to one client on the device.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    lead: ["icon", "none"],
  },
  variantParts: { "lead.none": { hides: ["kind"] } },
  items: {
    key: "entries",
    parts: ["root", "date", "kind", "title", "amount"],
    variants: { tone: ["neutral", "good", "warn", "bad"], mark: ["none", "highlight"] },
  },
  parts: ["root", "empty"],
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] } },
  read: (input, state, lang?: string): string[] => {
    const { historyDetailLine } = wordsFor(lang);
    return state !== "filled"
      ? []
      : (input as z.output<typeof props>).entries.flatMap((entry) => [
          historyDetailLine(entry.kind, entry.date),
          ...(entry.amount === undefined ? [] : [changeLine(entry.amount, "money", undefined, lang)]),
        ]);
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    entries: z
      .array(
        z.strictObject({
          date: isoDate,
          kind: z.enum(["visit", "order", "payment", "note", "message"]).meta({ kind: "text" }),
          title: text(32),
          amount: z.number().optional(),
          goto: screenId,
          ...itemVariantProps(meta.items.variants),
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
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const entries = itemsOf(cast, 3).map((item) => ({
    date: "2026-11-18",
    kind: "note" as const,
    title: titleOf(item, 32, thing) || placeholderTitle(0, lang),
    goto: "details",
  }));
  return {
    entries: entries.length
      ? entries
      : [{ date: "2026-11-18", kind: "note", title: placeholderTitle(0, lang), goto: "details" }],
  };
}
type ExampleEntry = z.input<typeof props>["entries"][number];
// prettier-ignore
const variantExample = [
  { date: "2026-11-21", kind: "payment", title: "Walks paid", amount: 90, goto: "payment" },
  { date: "2026-11-20", kind: "message", title: "Pickup pending", goto: "messages" },
  { date: "2026-11-19", kind: "payment", title: "Payment reversed", amount: -30, goto: "reversal" },
] satisfies [ExampleEntry, ExampleEntry, ExampleEntry];
const [payment, message, reversal] = variantExample;
// prettier-ignore
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
  { entries: variantExample, density: "compact" },
  { entries: variantExample, surface: "outlined" },
  { entries: variantExample, lead: "none" },
  { entries: [{ ...payment, mark: "highlight" }, message, reversal] },
  { entries: [{ ...payment, tone: "good" }, message, reversal] },
  { entries: [payment, { ...message, tone: "warn" }, reversal] },
  { entries: [payment, message, { ...reversal, tone: "bad" }] },
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
  {
    ...write(
      "Show Ben's client history: payment of 120 on 2026-11-18 opening payment and a park walk on 2026-11-17 opening visit. Keep the event labels and dates, but don't show icons at the start of the rows.",
    ),
    variant: { axis: "lead", value: "none" },
  },
  read("Open the watering and leaf care visit", { address: "c1/r1", action: "press" }),
] satisfies Probe[];

const kindIcons = {
  visit: "calendar",
  order: "shopping_bag",
  payment: "banknote",
  note: "file_text",
  message: "message",
} as const;

export function ClientHistory(input: Props<typeof props, typeof meta>) {
  const { entries, lead, surface } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const { lang, words } = useWords();
  const { historyDetailLine } = words;
  const state = useComponentState();
  return (
    <KitCard style="inset" part="root" {...{ density, surface }}>
      {state === "empty" ? (
        <KitEmpty decorativeIcon part="empty" />
      ) : state === "loading" ? (
        <KitSkeleton
          rows={entries.length}
          lead={lead === "none" ? "none" : "dot"}
          {...{ density }}
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
            tone={entry.tone}
            surface={entry.tone === "neutral" ? undefined : "plain"}
            mark={entry.mark}
            {...{ density }}
            leading={lead === "icon" && <KitIcon name={kindIcons[entry.kind]} part="kind" />}
            trailing={
              entry.amount === undefined ? (
                <KitIcon name="chevron_right" decorative />
              ) : (
                <KitTrail
                  kind="value"
                  value={changeLine(entry.amount, "money", undefined, lang)}
                  part="amount"
                  {...{ density }}
                />
              )
            }
          >
            <KitText part="title" {...{ density }}>
              {entry.title}
            </KitText>
            <KitText role="caption" tone="muted" part="date" {...{ density }}>
              {historyDetailLine(entry.kind, entry.date)}
            </KitText>
          </KitRow>
        ))
      )}
    </KitCard>
  );
}

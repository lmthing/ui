import { z } from "zod";
import {
  itemsOf,
  moneyLine,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Checklist/default can tick off jobs but cannot move cards between named stages.
export const meta = {
  id: "Board",
  status: "draft",
  group: "data",
  purpose: "See records by stage and move them between stages.",
  pick: "Move cards between two to five named stage columns with counts and optional totals. Not ticking off jobs in one list (Checklist), working a service request queue (RequestQueue), or a week of shifts (Roster).",
  writeHints: [
    "card.column is a zero-based index into columns. Use unique stage labels because the move action takes the destination label. Counts and totals are computed; never write them.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Records with a stage field on the device.",
  variants: { density: ["compact", "comfortable"] },
  parts: ["root", "columns"],
  items: { key: "cards", parts: ["root", "title", "tag", "who", "value"] },
  states: ["filled", "empty"],
  actions: { items: { root: ["press", "move"] } },
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { columns, cards } = input as z.output<typeof props>;
    return [
      columns.map(({ label }) => label).join(" · "),
      ...cards.map(
        ({ title, column, tag, who, value }, i) =>
          `r${i + 1}: ${[columns[column]?.label, title, tag, who, value === undefined ? undefined : moneyLine(value, undefined, undefined, lang)].filter(Boolean).join(" · ")}`,
      ),
    ];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    columns: z
      .array(z.strictObject({ label: text(14) }))
      .min(2)
      .max(5),
    cards: z
      .array(
        z.strictObject({
          title: text(32),
          column: z.int().min(0).max(4),
          tag: text(12).optional(),
          who: text(16).optional(),
          value: z.number().optional(),
          goto: screenId,
        }),
      )
      .min(1)
      .max(16),
  })
  .refine(({ columns }) => new Set(columns.map(({ label }) => label)).size === columns.length, {
    path: ["columns"],
    message: "Use distinct stage labels",
  })
  .refine(({ columns, cards }) => cards.every(({ column }) => column < columns.length), {
    path: ["cards"],
    message: "Each card must refer to an existing column",
  });

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const cards = itemsOf(cast, 16, thing?.type).map((item, i) => ({
    title: titleOf(item, 32, thing) ?? placeholderTitle(i, lang),
    column: i % 2,
    goto: "detail",
  }));
  return {
    columns: [0, 1].map((i) => ({ label: placeholderTitle(i, lang) })),
    cards: cards.length ? cards : [{ title: placeholderTitle(0, lang), column: 0, goto: "detail" }],
  };
}

export const examples = [
  {
    columns: [{ label: "Waiting" }, { label: "In care" }, { label: "Recovered" }],
    cards: [
      { title: "Repot the Boston fern", column: 0, tag: "Rootbound", who: "Ana", goto: "fern" },
      { title: "Check the rubber plant", column: 1, goto: "rubber" },
    ],
  },
  {
    density: "comfortable",
    columns: [{ label: "New" }, { label: "Quoted" }, { label: "Booked" }],
    cards: [
      { title: "Milo's weekday walks", column: 1, tag: "Recurring", who: "Sam", value: 70, goto: "milo" },
      { title: "Pip's first park loop", column: 2, who: "Ana", value: 18, goto: "pip" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Board");
export const probes = [
  choose(
    "Put work cards in separate Waiting, In progress and Done columns. Let me move each card between the columns.",
  ),
  choose(
    "Give me one list of jobs where I can tick each job when it's done. No columns or stages.",
    "Checklist",
  ),
  write(
    "Show Waiting and In care as the two stages, and a card Repot the Boston fern in Waiting linking to fern.",
  ),
  read("Move Repot the Boston fern into In care.", { address: "s1/r1", action: "move" }),
] satisfies Probe[];

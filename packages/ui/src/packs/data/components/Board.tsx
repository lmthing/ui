import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { StageBoard, type StageCard } from "../../../kit/renderers";
import { boardReading, boardStages } from "../copy";
import { dataWordsFor } from "../lang";

// Core first: Checklist/default can tick off jobs but cannot move cards between named stages.
export const meta = {
  id: "Board",
  status: "ready",
  group: "data",
  purpose: "See records by stage and move them between stages.",
  pick: "Move cards between two to five named stage columns with counts and optional totals. Not ticking off jobs in one list (Checklist), working a service request queue (RequestQueue), or a week of shifts (Roster).",
  writeHints: [
    "card.column is a zero-based index into columns. Use unique stage labels because the move action takes the destination label. Counts and totals are computed; never write them.",
    'Use arrange "rows" for stages stacked vertically, otherwise null. Leave density and surface null unless requested.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Records with a stage field on the device.",
  variants: {
    density: ["compact", "comfortable"],
    surface: ["plain", "outlined"],
    arrange: ["strip", "rows"],
  },
  parts: ["root", "columns", "empty"],
  items: {
    key: "cards",
    parts: ["root", "title", "tag", "who", "value"],
    move: { column: "column", columns: "columns" },
  },
  states: ["filled", "empty"],
  actions: { items: { root: ["press", "move"] } },
  read: (input, state, lang, _data, currency): string[] =>
    state === "filled" ? boardReading(input as ViewProps, lang, currency) : [],
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    columns: z
      .array(z.strictObject({ label: c.text(14) }))
      .min(2)
      .max(5),
    cards: z
      .array(
        z.strictObject({
          title: c.text(32),
          column: z.int().min(0).max(4),
          tag: c.text(12).optional(),
          who: c.text(16).optional(),
          value: z.number().optional(),
          goto: c.screenId,
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

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const cards = c.itemsOf(cast, 16, thing?.type).map((item, i) => ({
    title: c.titleOf(item, 32, thing) ?? c.placeholderTitle(i, lang),
    column: i % 2,
    goto: "detail",
  }));
  return {
    columns: [0, 1].map((i) => ({ label: c.placeholderTitle(i, lang) })),
    cards: cards.length ? cards : [{ title: c.placeholderTitle(0, lang), column: 0, goto: "detail" }],
  };
}

export const examples = [
  {
    columns: [{ label: "Waiting" }, { label: "In care" }, { label: "Recovered" }],
    cards: [
      { title: "Boston fern", column: 0, tag: "Rootbound", who: "Ana", goto: "fern" },
      { title: "Rubber plant", column: 1, goto: "rubber" },
    ],
  },
  {
    arrange: "rows",
    columns: [{ label: "New" }, { label: "Quoted" }, { label: "Booked" }],
    cards: [
      { title: "Milo's weekday walks", column: 1, tag: "Recurring", who: "Sam", value: 70, goto: "milo" },
      { title: "Pip's first park loop", column: 2, who: "Ana", value: 18, goto: "pip" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Board");
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
  {
    ...write(
      "Stack the Waiting and In care stages vertically, one above the other. Put Repot the Boston fern in Waiting, linking to fern.",
    ),
    variant: { axis: "arrange", value: "rows" },
  },
  read(
    "Move the Boston fern card to In care. Copy the card address and the action word after it from the move bracket. Do not include the destination value.",
    { address: "s1/r1", action: "move" },
  ),
] satisfies c.Probe[];

type ViewProps = c.Props<typeof props, typeof meta>;
function boardCard(
  { id, column, goto, title, tag, who, value }: ViewProps["cards"][number],
  density: c.ThemeDensity,
  lang: string,
  currency?: c.AppCurrency,
): StageCard {
  const lines: StageCard["lines"][number][] = [{ part: "title", role: "body", text: title, density }];
  if (tag) lines.push({ part: "tag", role: "caption", tone: "muted", text: tag });
  if (who) lines.push({ part: "who", role: "caption", tone: "muted", text: who });
  if (value !== undefined)
    lines.push({
      part: "value",
      role: "number",
      numberScale: "compact",
      tabular: true,
      text: c.moneyLine(value, currency, undefined, lang),
    });
  return { id, column, goto, label: title, lines };
}

export function Board({ columns, cards, density: requestedDensity, surface, arrange }: ViewProps) {
  const density = kit.useVariant("density", meta.variants.density, requestedDensity);
  const layout = kit.useVariant("arrange", meta.variants.arrange, arrange);
  const state = kit.useComponentState();
  const { words, lang } = kit.useWords(dataWordsFor);
  const currency = kit.useAppCurrency();
  const stages = boardStages(columns, cards, lang, currency);
  const background = state === "empty" && surface === "plain" ? "card" : surface;
  return (
    <kit.KitCard density={density} padded={surface === "outlined"} surface={background}>
      {state === "empty" ? (
        <kit.KitEmpty part="empty" decorativeIcon />
      ) : (
        <StageBoard
          part="columns"
          style={layout === "rows" ? "stack" : "columns"}
          density={density}
          lanes={stages.map(({ label, count, total }) => ({
            id: label,
            label,
            count,
            total: total ? { label: words.boardTotal, value: total } : undefined,
          }))}
          cards={cards.map((card) => ({
            ...boardCard(card, density, lang, currency),
            destinations: c
              .itemMoveOffer(meta, { cards, columns }, card)
              ?.choices.map((label) => ({ label, value: label })),
          }))}
          move={{ caption: words.boardMove, label: words.boardDestination }}
        />
      )}
    </kit.KitCard>
  );
}

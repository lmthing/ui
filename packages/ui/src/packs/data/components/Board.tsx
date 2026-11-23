import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { StageBoard, type StageCard } from "../../../kit/renderers";
import { boardReading, boardStages, boardSwimlanes } from "../copy";
import { dataWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Board.generated";

// Core first: Checklist/default can tick off jobs but cannot move cards between named stages.
export const meta = {
  id: "Board",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Records with a stage field on the device.",
  variants: {
    arrange: ["strip", "rows"],
  },
  parts: ["root", "columns", "empty", "swimlane_1", "swimlane_2", "swimlane_3", "swimlane_4"],
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
          swimlane: c.text(16).optional(),
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
  })
  .refine(({ cards }) => new Set(cards.map(({ swimlane }) => swimlane)).size <= 4, {
    path: ["cards"],
    message: "Use at most four swimlanes, including cards without a swimlane",
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
  {
    arrange: "rows",
    columns: [{ label: "New" }, { label: "Booked" }],
    cards: [
      { title: "Milo's weekday walks", column: 0, swimlane: "Recurring", goto: "milo" },
      { title: "Pip's park loop", column: 1, swimlane: "One-off", goto: "pip" },
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
    "Move the Boston fern card to In care. Copy the address and the following verb directly from the offered move bracket. Use the card's own address without adding a suffix, and omit the destination value.",
    { address: "s1/r1", action: "move" },
  ),
  {
    ...write(
      "Use Waiting and In care as the stages. Put Repot the fern in Waiting, link to fern. Put Mist the rubber plant in In care, link to rubber. Keep both stages and put the cards in separate horizontal swimlanes named Repotting and Watering respectively.",
    ),
    expectProps: { cards: [{ swimlane: "Repotting" }, { swimlane: "Watering" }] },
  },
] satisfies c.Probe[];

type ViewProps = c.Props<typeof props, typeof meta>;
function BoardCard(
  card: ViewProps["cards"][number],
  input: ViewProps,
  density: c.ThemeDensity,
  currency: ReturnType<typeof kit.useAppCurrency>,
  lang: string,
): StageCard {
  const { id, column, goto, title, tag, who, value } = card;
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
  const destinations = c.itemMoveOffer(meta, input, card)?.choices.map((label) => ({ label, value: label }));
  return { id, column, goto, label: title, lines, destinations };
}

export function Board(input: ViewProps) {
  const { columns, cards, arrange } = input;
  const density = kit.useKit().density;
  const layout = kit.useVariant("arrange", meta.variants.arrange, arrange);
  const state = kit.useComponentState();
  const { words, lang } = kit.useWords(dataWordsFor);
  const currency = kit.useAppCurrency();
  const background = state === "empty" ? "card" : "plain";
  const cardSlots = (card: ViewProps["cards"][number]) => BoardCard(card, input, density, currency, lang);

  const renderStages = (cards: ViewProps["cards"], part: string) => (
    <StageBoard
      {...{ part, density }}
      style={layout === "rows" ? "stack" : "columns"}
      lanes={boardStages(columns, cards, lang, currency).map(({ label, count, total }) => ({
        id: label,
        label,
        count,
        total: total ? { label: words.boardTotal, value: total } : undefined,
      }))}
      cards={cards.map(cardSlots)}
      move={{ caption: words.boardMove, label: words.boardDestination }}
    />
  );
  const grouped = cards.some(({ swimlane }) => swimlane);
  return (
    <kit.KitCard density={density} surface={background}>
      <kit.KitState part="empty" density={density}>
        {grouped ? (
          <kit.KitRow part="columns" inline inset="none" label={words.boardStages} density={density}>
            <kit.KitRowGroup spacing="groups" separators={false} density={density}>
              {boardSwimlanes(cards).map(({ label, cards }, index) => (
                <kit.KitContent group={index ? "response" : "content"} density={density} key={index}>
                  <kit.KitContent inset="md" density={density}>
                    <kit.KitHeader
                      title={{
                        text: label ?? words.boardUnassigned,
                        role: "meta",
                        tone: "muted",
                        strong: true,
                      }}
                      density={density}
                    />
                  </kit.KitContent>
                  {renderStages(cards, `swimlane_${index + 1}`)}
                </kit.KitContent>
              ))}
            </kit.KitRowGroup>
          </kit.KitRow>
        ) : (
          renderStages(cards, "columns")
        )}
      </kit.KitState>
    </kit.KitCard>
  );
}

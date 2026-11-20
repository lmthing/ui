import { z } from "zod";
import { numberLine, text, type Definition, type Props, type ScreenLike } from "@lmthing/ui/catalog";
import { KitColumns, KitText, useComponentState, useWords } from "@lmthing/ui/kit";

export const moveCaption = "Move to";
export const moveLabel = (destination: string, card: string) => `Move ${card} to ${destination}`;

const props = z
  .strictObject({
    style: z.enum(["columns", "stack"]),
    columns: z
      .array(z.strictObject({ label: text(14) }))
      .min(2)
      .max(5),
    cards: z.array(
      z.strictObject({
        title: text(32),
        column: z.number().int().min(0).max(4),
        goto: z.string().optional(),
      }),
    ),
  })
  .refine(({ cards, columns }) => cards.every(({ column }) => column < columns.length), {
    path: ["cards"],
    message: "Every card must have a declared source column",
  });
const meta = {
  id: "MoveFixture",
  purpose: "Move a card between its declared columns.",
  pick: "Test fixture.",
  group: "data",
  region: "body",
  weight: 3,
  tier: "phone",
  realPath: "Store the local column index.",
  items: { key: "cards", parts: ["root"], move: { column: "column", columns: "columns" } },
  actions: { items: { root: ["press", "move"] } },
  read(input: unknown, _state: unknown, lang?: string): string[] {
    const { columns, cards } = input as z.output<typeof props>;
    return [
      ...columns.map(
        ({ label }, index) =>
          `${JSON.stringify(label)} ${numberLine(cards.filter((card) => card.column === index).length, lang)}`,
      ),
      moveCaption,
    ];
  },
} as const satisfies Definition["meta"];

export const moveDef = {
  meta,
  props,
  fallback: () => ({}),
  examples: [],
  probes: [],
} satisfies Definition;
export const moveDefs = { MoveFixture: moveDef };

export const moveScreen: ScreenLike = {
  id: "home",
  components: [
    {
      id: "c1",
      c: "MoveFixture",
      style: "stack",
      columns: [{ label: "Waiting" }, { label: "In care" }, { label: "Finished" }],
      cards: [
        { title: "Snake plant", column: 0, goto: "snake_plant" },
        { title: "Pothos", column: 1, goto: "pothos" },
      ],
    },
  ],
};

export function MoveFixture({ columns, cards, style }: Props<typeof props, typeof meta>) {
  const loading = useComponentState() === "loading";
  const { lang } = useWords();
  return (
    <KitColumns
      columns={columns.map(({ label }, index) => ({
        id: String(index),
        label,
        count: numberLine(cards.filter((card) => card.column === index).length, lang),
      }))}
      move={{
        caption: moveCaption,
        label: moveLabel,
        cards: cards.map(({ title, ...card }) => ({
          ...card,
          label: title,
          children: <KitText part={null}>{title}</KitText>,
        })),
      }}
      {...{ style, loading }}
    />
  );
}

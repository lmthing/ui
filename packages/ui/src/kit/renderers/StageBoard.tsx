import type { ComponentProps } from "react";
import { KitColumns, KitContent, KitIcon, KitRow, KitText } from "../base";

type Columns = ComponentProps<typeof KitColumns>;
type Line = Pick<
  ComponentProps<typeof KitText>,
  "part" | "role" | "tone" | "density" | "numberScale" | "tabular"
> & {
  text: string;
};
export type StageLane = {
  id: string;
  part?: string;
  label: string;
  count: string;
  total?: { label: string; value: string } | undefined;
};
export type StageCard = {
  id: string;
  column: number;
  label: string;
  goto?: string | undefined;
  lines: readonly Line[];
  destinations?: readonly { value: string; label: string }[] | undefined;
};
export type StageBoardProps = Pick<Columns, "loading" | "style" | "part"> & {
  lanes: readonly StageLane[];
  cards: readonly StageCard[];
  density?: Line["density"];
  move?: Pick<NonNullable<Columns["move"]>, "caption" | "label"> | undefined;
};

function laneTotal({ label, value }: NonNullable<StageLane["total"]>) {
  return (
    <KitText part={null} role="caption" tone="muted">
      {label}{" "}
      <KitText part={null} role="number" numberScale="compact" tabular>
        {value}
      </KitText>
    </KitText>
  );
}

function cardLines(lines: StageCard["lines"], density: StageBoardProps["density"]) {
  return (
    <KitContent density={density}>
      {lines.map(({ text, part = null, ...line }, index) => (
        <KitText key={part ?? index} part={part} {...line}>
          {text}
        </KitText>
      ))}
    </KitContent>
  );
}

/** Draw counted lanes; only the owner decides which cards can move and where. */
export function StageBoard({ lanes, cards, density, move, ...columns }: StageBoardProps) {
  const withContent = cards.map((card) => ({ ...card, children: cardLines(card.lines, density) }));
  return (
    <KitColumns
      {...columns}
      columns={lanes.map(({ total, ...lane }, column) => ({
        ...lane,
        summary: total && laneTotal(total),
        children: move
          ? undefined
          : withContent
              .filter((card) => card.column === column)
              .map((card) => (
                <KitRow
                  key={card.id}
                  item={card.id}
                  label={card.label}
                  goto={columns.loading ? undefined : card.goto}
                  part={columns.loading ? null : "root"}
                  inset="none"
                  trailing={card.goto && <KitIcon name="chevron_right" decorative />}
                >
                  {card.children}
                </KitRow>
              )),
      }))}
      {...(move
        ? {
            move: {
              ...move,
              cards: withContent.map((card) => ({ ...card, destinations: card.destinations ?? [] })),
            },
          }
        : {})}
    />
  );
}

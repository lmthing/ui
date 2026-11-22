import { moneyLine, numberLine, type AppCurrency } from "../../../catalog";
import { dataWordsFor } from "../lang";

type Column = { label: string };
type Card = {
  column: number;
  title: string;
  id?: string;
  tag?: string | undefined;
  who?: string | undefined;
  swimlane?: string | undefined;
  value?: number | undefined;
};

export function boardSwimlanes<T extends Card>(cards: readonly T[]) {
  const lanes = new Map<string | undefined, T[]>();
  for (const card of cards) {
    if (!lanes.has(card.swimlane)) lanes.set(card.swimlane, []);
    lanes.get(card.swimlane)!.push(card);
  }
  return [...lanes].map(([label, cards]) => ({ label, cards }));
}

export function boardStages(
  columns: readonly Column[],
  cards: readonly Card[],
  lang?: string,
  currency?: AppCurrency,
) {
  return columns.map(({ label }, index) => {
    const group = cards.filter(({ column }) => column === index);
    const values = group.flatMap(({ value }) => (value === undefined ? [] : [value]));
    return {
      label,
      count: numberLine(group.length, lang),
      total: values.length
        ? moneyLine(
            values.reduce((sum, value) => sum + value, 0),
            currency,
            undefined,
            lang,
          )
        : undefined,
    };
  });
}

export function boardReading(
  { columns, cards }: { columns: readonly Column[]; cards: readonly Card[] },
  lang?: string,
  currency?: AppCurrency,
): string[] {
  const words = dataWordsFor(lang);
  const stageLine = (cards: readonly Card[]) =>
    boardStages(columns, cards, lang, currency)
      .map(({ label, count, total }) => words.boardStage(label, count, total))
      .join(" · ");
  const cardLine = ({ id, title, column, tag, who, value }: Card, index: number) =>
    words.boardCard(id ?? `r${index + 1}`, [
      columns[column]!.label,
      title,
      tag,
      who,
      value === undefined ? undefined : moneyLine(value, currency, undefined, lang),
    ]);
  if (!cards.some(({ swimlane }) => swimlane))
    return [stageLine(cards), words.boardMove, ...cards.map(cardLine)];
  const addressed = cards.map((card, index) => ({ ...card, id: card.id ?? `r${index + 1}` }));
  return [
    words.boardMove,
    ...boardSwimlanes(addressed).flatMap(({ label, cards }) => [
      label ?? words.boardUnassigned,
      stageLine(cards),
      ...cards.map(cardLine),
    ]),
  ];
}

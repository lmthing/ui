import { moneyLine, numberLine, type AppCurrency } from "../../../catalog";
import { dataWordsFor } from "../lang";

type Column = { label: string };
type Card = {
  column: number;
  title: string;
  id?: string;
  tag?: string | undefined;
  who?: string | undefined;
  value?: number | undefined;
};

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
) {
  const words = dataWordsFor(lang);
  return [
    boardStages(columns, cards, lang, currency)
      .map(({ label, count, total }) => words.boardStage(label, count, total))
      .join(" · "),
    words.boardMove,
    ...cards.map(({ id, title, column, tag, who, value }, index) =>
      words.boardCard(id ?? `r${index + 1}`, [
        columns[column]!.label,
        title,
        tag,
        who,
        value === undefined ? undefined : moneyLine(value, currency, undefined, lang),
      ]),
    ),
  ];
}

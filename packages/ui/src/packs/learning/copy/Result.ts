import { clockLine, numberLine, stampLine, type StateName } from "../../../catalog";
import { learningWordsFor } from "../lang";

type Figures = { right: number; of: number; seconds?: number | undefined; points?: number | undefined };

export function resultFigures({ right, of, seconds, points }: Figures, lang?: string) {
  const { result } = learningWordsFor(lang);
  return {
    right: numberLine(right, lang),
    wrong: numberLine(of - right, lang),
    total: result.total(numberLine(of, lang)),
    seconds: seconds === undefined ? undefined : clockLine(seconds, lang),
    points: points === undefined ? undefined : numberLine(points, lang),
  };
}

export function readResult(input: unknown, state: StateName, lang?: string): string[] {
  const props = input as Figures & { mistakes: unknown[] };
  const { result } = learningWordsFor(lang);
  const { right, wrong, seconds, points } = resultFigures(props, lang);
  return [
    props.right === props.of ? result.perfect : result.score,
    stampLine(props.right, props.of, lang),
    `${result.right} ${right}`,
    `${result.wrong} ${wrong}`,
    ...(seconds === undefined ? [] : [`${result.seconds} ${seconds}`]),
    ...(points === undefined ? [] : [`${result.points} ${points}`]),
    ...(props.mistakes.length ? [result.corrections, ...(state === "filled" ? [result.review] : [])] : []),
    result.again,
  ];
}

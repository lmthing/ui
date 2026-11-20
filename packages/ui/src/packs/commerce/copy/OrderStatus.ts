import { documentFieldLine, timeOfDayLine } from "../../../catalog";
import { commerceWordsFor } from "../lang";

type Status = {
  at: number;
  seller: boolean;
  steps: readonly { label: string; time?: string | undefined }[];
};

export function nextOrderStage({ at, seller, steps }: Status): string | undefined {
  return seller ? steps[at + 1]?.label : undefined;
}

export function orderStatusReading(input: Status, complete: boolean, lang?: string): string[] {
  const words = commerceWordsFor(lang);
  const next = complete ? undefined : nextOrderStage(input);
  const current = input.steps[input.at]!.label;
  return [
    complete ? words.orderComplete : words.currentOrderStage(current),
    ...input.steps.flatMap(({ label, time }) =>
      time === undefined ? [] : [documentFieldLine(label, timeOfDayLine(time, lang), lang)],
    ),
    ...(next === undefined ? [] : [words.advanceOrder(next)]),
  ];
}

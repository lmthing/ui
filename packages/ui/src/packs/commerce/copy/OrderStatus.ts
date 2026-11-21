import { documentFieldLine, timeOfDayLine } from "../../../catalog";
import { commerceWordsFor } from "../lang";

type Status = {
  at: number;
  seller: boolean;
  steps: readonly { label: string; time?: string | undefined }[];
  style?: "carrier" | "pickup" | undefined;
  trackingNumber?: string | undefined;
  proofPhoto?: string | undefined;
  pickupCode?: string | undefined;
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
    ...(input.style === "carrier" && input.trackingNumber ? [words.tracking.copy(input.trackingNumber)] : []),
    ...(input.style === "carrier" && input.proofPhoto ? [words.tracking.proof] : []),
    ...(input.style === "pickup" && !complete && input.pickupCode
      ? [words.tracking.pickup(input.pickupCode)]
      : []),
    ...(input.style === "pickup" && !complete && !input.seller ? [words.tracking.here] : []),
    ...(next === undefined ? [] : [words.advanceOrder(next)]),
  ];
}

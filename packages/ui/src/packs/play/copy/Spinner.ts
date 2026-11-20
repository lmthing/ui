import { numberLine, pluralForm, type DrawState } from "../../../catalog";
import { playWordsFor } from "../lang";

export function spinnerLines(
  options: readonly { label: string }[],
  repeat: boolean,
  draw?: DrawState,
  lang?: string,
) {
  const words = playWordsFor(lang).spinner;
  const index = draw?.kind === "pick" ? draw.index : undefined;
  const remaining = draw?.kind === "pick" ? draw.remaining : options.length;
  const selected = index === undefined ? undefined : options[index]?.label;
  return {
    selected,
    status: repeat
      ? selected
        ? words.result
        : words.ready
      : remaining === 0
        ? words.exhausted
        : words.remaining(numberLine(remaining, lang), pluralForm(remaining, lang)),
    spin: selected ? words.again : words.spin,
    reset: repeat ? undefined : words.reset,
    exhausted: remaining === 0,
  };
}

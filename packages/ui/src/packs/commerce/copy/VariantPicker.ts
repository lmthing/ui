import { changeLine } from "../../../catalog";
import { commerceWordsFor } from "../lang";

type Detail = "full" | "brief";
type Option = { label: string; available: boolean; extra?: number | undefined };

export function variantExtra(extra: number | undefined, detail: Detail, lang?: string) {
  return detail === "brief" || extra === undefined ? undefined : changeLine(extra, "money", undefined, lang);
}

export function variantReading(options: readonly Option[], detail: Detail, lang?: string) {
  const words = commerceWordsFor(lang);
  return options.flatMap(({ label, available, extra }) => {
    const price = variantExtra(extra, detail, lang);
    const notes = [...(price === undefined ? [] : [price]), ...(available ? [] : [words.variantUnavailable])];
    return notes.length ? [words.variantReading(label, notes)] : [];
  });
}

import { changeLine } from "../../../catalog";
import { commerceWordsFor } from "../lang";

type Detail = "full" | "brief";
export const shadeDepths = ["fair", "light", "medium", "deep"] as const;
export const shadeUndertones = ["cool", "neutral", "warm"] as const;
type Shade = {
  depth?: (typeof shadeDepths)[number] | undefined;
  undertone?: (typeof shadeUndertones)[number] | undefined;
};
type Option = Shade & { label: string; available: boolean; extra?: number | undefined };

export function shadeGroups<T extends Shade>(options: readonly T[]) {
  return shadeDepths.flatMap((depth) => {
    const group = shadeUndertones.flatMap((under) =>
      options.flatMap((option, index) =>
        option.depth === depth && option.undertone === under ? [{ option, index }] : [],
      ),
    );
    return group.length ? [{ depth, group }] : [];
  });
}

export function variantExtra(extra: number | undefined, detail: Detail, lang?: string) {
  return detail === "brief" || extra === undefined ? undefined : changeLine(extra, "money", undefined, lang);
}

export function variantReading(options: readonly Option[], detail: Detail, lang?: string) {
  const words = commerceWordsFor(lang);
  return options.flatMap(({ label, available, extra, depth, undertone }) => {
    const price = variantExtra(extra, detail, lang);
    const notes = [
      depth && words.shadeDepth[depth],
      undertone && words.shadeUndertone[undertone],
      price,
      available ? undefined : words.variantUnavailable,
    ].filter((text) => text !== undefined);
    return notes.length ? [words.variantReading(label, notes)] : [];
  });
}

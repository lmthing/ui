import { normalizeComponentId } from "./aliases";
import { migrateVariantProps, variantMoves } from "./variant-line";

type SavedLine = Record<string, unknown>;

/** Ring retirement v1. Enable at saved-input boundaries with the Progress ring style. */
export function migrateRingV1<T extends SavedLine>(line: T): T | (SavedLine & { c: "Progress" }) {
  if (typeof line.c !== "string" || normalizeComponentId(line.c) !== "ring") return line;
  const { c: _c, emphasis, detail, density, sub, style, ...source } = line;
  if (style != null && style !== "md" && style !== "lg") return line;
  const { label, value, of, ...rest } = migrateVariantProps(
    {
      ...source,
      ...(style != null ? { style } : {}),
      ...(emphasis != null ? { emphasis } : {}),
      ...(density != null ? { density } : {}),
      ...(detail != null ? { detail } : {}),
      ...(sub != null ? { sub } : {}),
    },
    variantMoves.Ring ?? [],
  );
  return { ...rest, c: "Progress", style: "ring", bars: [{ label, value, of }] };
}

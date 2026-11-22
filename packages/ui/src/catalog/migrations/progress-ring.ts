import { normalizeComponentId } from "./aliases";
import { migrateVariantProps, variantMoves } from "./variant-line";

type SavedLine = Record<string, unknown>;

/** Ring retirement v1: keep the saved component address and move its goal into Progress. */
export function migrateRingV1<T extends SavedLine>(line: T): T | (SavedLine & { c: "Progress" }) {
  if (typeof line.c !== "string" || normalizeComponentId(line.c) !== "ring") return line;
  const {
    c: _c,
    emphasis,
    detail,
    density: _density,
    surface: _surface,
    align: _align,
    bleed: _bleed,
    sub,
    style,
    ...source
  } = line;
  if (style != null && style !== "md" && style !== "lg") return line;
  const { label, value, of, ...rest } = migrateVariantProps(
    {
      ...source,
      ...(style != null ? { style } : {}),
      ...(emphasis != null ? { emphasis } : {}),
      ...(detail != null ? { detail } : {}),
      ...(sub != null ? { sub } : {}),
    },
    variantMoves.Ring ?? [],
  );
  return { ...rest, c: "Progress", style: "ring", bars: [{ label, value, of }] };
}

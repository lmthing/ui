import { expect, it } from "vitest";
import { createRegistry, isoDate } from "@lmthing/ui/catalog";
import { compositionHistoryCast } from "./compose-history-cast";
import { compositionScaleCast } from "./compose-scale-cast";

it("preserves other casts and gives each history layout matching dated content", () => {
  for (const [id, layout] of [
    ["tracker", "scale"],
    ["list", "plain"],
  ])
    expect(compositionHistoryCast(id!, layout!)).toEqual(compositionScaleCast(id!, layout!));
  for (const [id, layout, count] of [
    ["calendar", "week", 2],
    ["calendar", "month", 3],
    ["journal", "entries", 2],
  ] as const) {
    const cast = compositionHistoryCast(id, layout);
    expect(cast.items).toHaveLength(count);
    expect(cast.items.every((item) => isoDate.safeParse(item.date).success)).toBe(true);
    expect(createRegistry().defaultLines(id, layout, cast).components.length).toBeGreaterThanOrEqual(3);
  }
});

import { expect, it } from "vitest";
import { createRegistry } from "@lmthing/ui/catalog";
import { compositionCast } from "./compose-casts";
import { compositionScaleCast } from "./compose-scale-cast";

it("preserves every other composition cast and supplies one coherent scale metric", () => {
  for (const [id, layout] of [
    ["tracker", "counter"],
    ["tracker", "timer"],
    ["plans", "plans"],
    ["calendar", "week"],
  ])
    expect(compositionScaleCast(id!, layout!)).toEqual(compositionCast(id!, layout!));
  const cast = compositionScaleCast("tracker", "scale");
  expect(cast.items.map((item) => item.value)).toEqual([3, 2, 4, 3]);
  expect(cast.items.every((item) => item.unit === "rating")).toBe(true);
  expect(cast.items.map((item) => item.day)).toEqual(["Today", "Mon", "Tue", "Wed"]);
  expect(createRegistry().defaultLines("tracker", "scale", cast).components.length).toBeGreaterThanOrEqual(3);
});

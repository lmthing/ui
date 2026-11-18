import { expect, it } from "vitest";
import { compositionCast } from "./compose-casts";
it.each([
  ["tracker", "counter", "water_log"],
  ["tracker", "timer", "session"],
  ["plans", "plans", "plan"],
  ["chat", "conversation", "message"],
  ["settings", "toggles", "setting"],
  ["list", "plain", "plant"],
])("preserves the fixture for %s/%s", (id, layout, type) => {
  const cast = compositionCast(id!, layout!);
  expect(cast.things[0]?.type).toBe(type);
  expect(cast.items.every((item) => item.type === type && item.sample)).toBe(true);
});
it("returns fresh non-default fixture objects", () => {
  const cast = compositionCast("tracker", "counter");
  expect(compositionCast("tracker", "counter")).toEqual(cast);
  expect(compositionCast("tracker", "counter")).not.toBe(cast);
});

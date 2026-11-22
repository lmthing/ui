import { expect, it } from "vitest";
import { miniPlayerTiming } from "../../copy";

it.each([
  [0, 480, "0:00 · 8:00 left"],
  [45, 480, "0:45 · 7:15 left"],
  [480, 480, "8:00 · 0:00 left"],
] as const)("formats elapsed and remaining at %i of %i seconds", (at, seconds, timing) => {
  expect(miniPlayerTiming({ at, seconds }, "en")).toBe(timing);
});

it("uses the supplied language tag for both times", () => {
  expect(miniPlayerTiming({ at: 45, seconds: 480 }, "ar-EG")).toBe("٠:٤٥ · ٧:١٥ left");
});

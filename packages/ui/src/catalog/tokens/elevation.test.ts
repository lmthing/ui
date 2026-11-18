import { expect, it } from "vitest";
import { zIndex } from "./elevation";

it("keeps the sheet above its backdrop and the overlay above screen content", () => {
  expect(zIndex.base).toBe(0);
  expect(zIndex.overlay).toBeGreaterThan(zIndex.base);
  expect(zIndex.sheet).toBeGreaterThan(zIndex.overlay);
});

import { expect, it } from "vitest";
import { bookLabel } from "../../copy";

it("keeps the booking cue unchanged", () => {
  expect(bookLabel).toBe("Book");
});

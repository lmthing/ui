import { expect, it } from "vitest";
import { careLabels } from "../../copy";

it("keeps the last-completion label unchanged", () => {
  expect(careLabels).toEqual({ last: "Last done" });
});

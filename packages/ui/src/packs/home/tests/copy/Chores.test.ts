import { expect, it } from "vitest";
import { choreLabels } from "../../copy";

it("keeps the chore points label unchanged", () => {
  expect(choreLabels).toEqual({ points: "points" });
});

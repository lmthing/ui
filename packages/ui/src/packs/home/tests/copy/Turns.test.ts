import { expect, it } from "vitest";
import { turnLabels } from "../../copy";

it("keeps completion and skip actions unchanged", () => {
  expect(turnLabels).toEqual({ next: "Done, next", skip: "Skip" });
});

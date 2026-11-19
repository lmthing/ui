import { expect, it } from "vitest";
import { kitchenItemLine, kitchenLabels } from "./kitchen";

it("labels the input and timer controls without inventing cast content", () => {
  expect(kitchenLabels).toEqual({ newItem: "Type a new grocery item", timer: "Cooking timer" });
});
it("keeps grouped labels associated with their stable row addresses", () => {
  expect(kitchenItemLine(0, "First")).toBe("r1: First");
  expect(kitchenItemLine(27, "Last")).toBe("r28: Last");
});

import { expect, it } from "vitest";
import { documentedEmptyStates, emptyExpectations } from "./empty-expectations";

it("uses descriptions on state lines and explicit component-guide entries, not all empty states", () => {
  expect(
    documentedEmptyStates(`
### \`Orders\` · planned
- Parts → actions: rows \`root press\`. · States: filled, empty (no orders awaiting payment).
### \`List\` · ready
- States: filled, empty, loading.
## Existing cases
- \`Approval\`: empty (no requests waiting for a decision).
`),
  ).toEqual({ orders: "no orders awaiting payment", approval: "no requests waiting for a decision" });
  expect(emptyExpectations()).toMatchObject({
    approval: "no requests waiting for a decision",
    traveldocs: "no travel documents",
  });
});

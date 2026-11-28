import { expect, test } from "vitest";
import type { FlowFrame } from "@lmthing/ui/catalog";
import { draftFields } from "./flow-draft";

const frame: FlowFrame = {
  key: "customer/cart",
  role: "customer",
  goal: "Review the cart",
  see: "Quantity and notes",
  title: "Cart",
  layout: { components: ["Choice", "Field"] },
  states: ["error"],
  messages: {},
  fields: ["note"],
  choice: { field: "quantity", options: ["one", "two"], total: { field: "total", unitPrice: "price" } },
  forward: [],
};

const record = { note: "Keep warm", quantity: "1", one: "1", two: "2", price: 7.5, total: "$7.50" };

test("only intentional edits update the record and the preview re-quotes a changed quantity", () => {
  const values: Record<string, unknown> = {
    "step_1/field_1/field": "  Slice thick  ",
    "step_1/choice/$at": 1,
    "step_2/field_1/field": "Other draft",
  };
  expect(draftFields("step_1", frame, record, (address) => values[address])).toEqual({
    note: "Slice thick",
    quantity: "2",
    total: "$15.00",
  });
  expect(record.total).toBe("$7.50");
});

test("does not overwrite the seed until there is an edit and preserves empty input for validation", () => {
  expect(draftFields("step_1", frame, record, () => undefined)).toEqual({});
  expect(
    draftFields("step_1", frame, record, (address) => (address.includes("/field_1/") ? " " : 3)),
  ).toEqual({
    note: "",
  });
});

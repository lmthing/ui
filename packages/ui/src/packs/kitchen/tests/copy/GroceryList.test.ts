import { describe, expect, it } from "vitest";
import { groceryLabels, groceryRead } from "../../copy";

describe("GroceryList copy", () => {
  it("reads optional quantities, shared authors and stable grouped row addresses", () => {
    expect(
      groceryRead({
        aisles: [
          { label: "Produce", items: [{ name: "Tomatoes", qty: "600 g", by: "Sam", got: false }] },
          { label: "Dairy", items: [{ name: "Ricotta", got: true }] },
        ],
      }),
    ).toEqual([
      JSON.stringify(groceryLabels.newItem),
      '"Produce"',
      'r1: "Tomatoes" · "600 g" · "Sam" !needs-people',
      '"Dairy"',
      'r2: "Ricotta"',
    ]);
  });
  it("reads completion only when every item is bought", () => {
    const input = { aisles: [{ label: "Breakfast", items: [{ name: "Oats", got: true }] }] };
    expect(groceryRead(input)).toContain(JSON.stringify(groceryLabels.allGot));
    input.aisles[0]!.items[0]!.got = false;
    expect(groceryRead(input)).not.toContain(JSON.stringify(groceryLabels.allGot));
  });
});

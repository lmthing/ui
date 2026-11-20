import { kitchenItemLine } from "../../../catalog";

import { kitchenWordsFor } from "../lang";

export const { groceryLabels } = kitchenWordsFor();

type GroceryItem = { name: string; qty?: string | undefined; by?: string | undefined; got: boolean };
type GroceryInput = { aisles: { label: string; items: GroceryItem[] }[]; detail?: "full" | "brief" };

/** Grouped text retains wire-order row addresses even when bought rows move on screen. */
export function groceryRead({ aisles, detail = "full" }: GroceryInput, lang?: string): string[] {
  const { groceryLabels } = kitchenWordsFor(lang);
  let index = 0;
  return [
    JSON.stringify(groceryLabels.newItem),
    ...(aisles.every((aisle) => aisle.items.every((item) => item.got))
      ? [JSON.stringify(groceryLabels.allGot)]
      : []),
    ...aisles.flatMap((aisle) => [
      JSON.stringify(aisle.label),
      ...aisle.items.map((item) =>
        kitchenItemLine(
          index++,
          [
            JSON.stringify(item.name),
            item.qty && JSON.stringify(item.qty),
            detail === "full" && item.by && `${JSON.stringify(item.by)} !needs-people`,
          ]
            .filter(Boolean)
            .join(" · "),
        ),
      ),
    ]),
  ];
}

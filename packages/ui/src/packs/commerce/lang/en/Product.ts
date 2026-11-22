import type { CommerceWords } from "..";

export const words = {
  product: {
    stock: (count) => `Only ${count} left`,
    stockField: "stock",
    soldOut: "Sold out",
    quantity: (count) => `Quantity: ${count}`,
    save: "Save for later",
    unsave: "Remove from saved items",
    add: "Add to basket",
    added: "Added to basket",
    aisle: (aisle) => `Aisle ${aisle}`,
    storeStock: (count) => `${count} in store`,
    scan: "Scan barcode",
  },
} satisfies Pick<CommerceWords, "product">;

export const en = {
  packing: {
    progress: "Packing progress",
    allPacked: "All packed",
    add: "Add an item",
    quantity: (count: string) => `×${count}`,
    itemLabel: (name: string, quantity: string) => `${name}, ${quantity}`,
  },
};

export type TripsWords = typeof en;

export const words = {
  packing: {
    progress: "Packing progress",
    allPacked: "All packed",
    add: "Add an item",
    addHint: "Type an item name",
    quantity: (count: string) => `×${count}`,
    itemLabel: (name: string, quantity: string) => `${name}, ${quantity}`,
  },
};

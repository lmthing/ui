export const words = {
  wishlist: {
    got: "Mark as owned",
    price: (amount: string) => ["Price ", amount] as const,
    target: (amount: string) => ["Target ", amount] as const,
    priority: { 1: "High priority", 2: "Medium priority", 3: "Low priority" },
    separator: " · ",
  },
};

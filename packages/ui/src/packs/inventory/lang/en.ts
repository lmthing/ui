export const en = {
  things: {
    low: "Low stock",
    stocked: "Nothing needs restocking",
    quantity: (count: string) => `Quantity: ${count}`,
    minimum: (count: string) => `Minimum: ${count}`,
    less: (name: string) => `Decrease quantity, ${name}`,
    more: (name: string) => `Increase quantity, ${name}`,
    reading: (fields: string[]) => fields.join(" · "),
  },
  storage: {
    path: "Storage path",
    spots: "Storage spots",
    here: "Stored here",
    emptyHere: "Nothing stored here",
    countUnit: (form: Intl.LDMLPluralRule) => (form === "one" ? " item" : " items"),
  },
  loans: {
    way: { lent: "Lent to ", borrowed: "Borrowed from " },
    since: (date: string) => `Since ${date}`,
    due: (date: string) => `Due back ${date}`,
    overdue: "Overdue",
    returned: "Mark returned",
    remind: "Remind",
    reading: (fields: string[]) => fields.join(" · "),
  },
  warranties: {
    bought: (date: string) => `Bought ${date}`,
    through: (date: string) => `Through ${date}`,
    noEnd: "No end date recorded",
    empty: "No warranties yet",
    status: { active: "Covered", soon: "Ending soon", ended: "Expired" },
    separator: " · ",
    receipt: "Receipt photo",
    receiptFor: (name: string) => `Receipt for ${name}`,
    reading: (fields: string[]) => fields.join(" · "),
  },
  wishlist: {
    got: "Mark as owned",
    price: (amount: string) => `Price ${amount}`,
    target: (amount: string) => `Target ${amount}`,
    priority: { 1: "High priority", 2: "Medium priority", 3: "Low priority" },
    separator: " · ",
  },
};

export type InventoryWords = typeof en;

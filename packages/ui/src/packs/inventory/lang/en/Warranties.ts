export const words = {
  warranties: {
    bought: (date: string) => `Bought ${date}`,
    through: (date: string) => `Through ${date}`,
    noEnd: "No end date recorded",
    status: { active: "Covered", soon: "Ending soon", ended: "Expired" },
    separator: " · ",
    receipt: "Receipt photo",
    receiptFor: (name: string) => `Receipt for ${name}`,
    reading: (fields: string[]) => fields.join(" · "),
  },
};

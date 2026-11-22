export const words = {
  savedItemLabels: {
    taxable: "Taxable",
    taxExempt: "Not taxable",
    uncategorized: "Uncategorized",
    unit: (unit: string) => ` / ${unit}`,
    taxJoin: " · ",
    add: (title: string) => `Add ${title} to the invoice`,
    remove: (title: string) => `Remove ${title} from saved items`,
    success: "Billing item updated",
    error: "Billing item wasn’t saved",
  },
};

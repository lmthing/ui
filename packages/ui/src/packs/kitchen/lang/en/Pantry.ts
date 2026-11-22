const places = { cupboard: "Cupboard", fridge: "Fridge", freezer: "Freezer" };

export const words = {
  pantryLabels: {
    ...places,
    used: "Used up",
    expired: "Expired",
    soon: "Use soon",
    dated: "Use by",
    undated: "Use-by date",
    missing: "Not set",
    low: "Low stock",
  },
  pantryOpened: (date: string) => `Opened ${date}`,
  pantryPlace: (place: string) => place.toLowerCase(),
};

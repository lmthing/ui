export const words = {
  listing: {
    per: { month: "/ month", week: "/ week" },
    beds: (count: string, form: Intl.LDMLPluralRule) => `${count} ${form === "one" ? "bed" : "beds"}`,
    baths: (count: string, form: Intl.LDMLPluralRule) => `${count} ${form === "one" ? "bath" : "baths"}`,
    areaUnit: { m2: "m²", ft2: "ft²" },
    unitSpace: "\u00a0",
    available: (date: string) => `Available from ${date}`,
    contact: "Contact",
    save: "Save",
    unsave: "Unsave",
    separator: " · ",
  },
};

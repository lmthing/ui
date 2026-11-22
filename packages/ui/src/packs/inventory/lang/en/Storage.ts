export const words = {
  storage: {
    path: "Storage path",
    spots: "Storage spots",
    here: "Stored here",
    emptyHere: "Nothing stored here",
    countUnit: (form: Intl.LDMLPluralRule) => (form === "one" ? " item" : " items"),
  },
};

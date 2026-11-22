export const words = {
  spinner: {
    pool: "Draw pool",
    empty: "Nothing drawn yet",
    ready: "Ready to spin",
    result: "Selected at random",
    exhausted: "No options left",
    remaining: (count: string, plural: Intl.LDMLPluralRule) =>
      `${count} ${plural === "one" ? "option" : "options"} left`,
    spin: "Spin",
    again: "Spin again",
    reset: "Reset options",
  },
};

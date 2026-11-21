export const en = {
  ledger: {
    heading: "Cash ledger",
    from: "From",
    to: "To",
    in: "Money in",
    out: "Money out",
    account: "Account",
    category: "Category",
    source: "Source",
    transfer: "Transfer",
    net: "Net",
    vat: "VAT",
    balance: "Balance",
    export: "Export ledger",
    errorTitle: "Ledger needs attention",
    error: "Check sources and transfer pairs.",
    unavailable: "—",
    refLabel: (ref: string, lang?: string) =>
      ref[0]!.toLocaleUpperCase(lang) + ref.slice(1).replace(/_/g, " "),
    field: (label: string, value: string) => `${label}: ${value}`,
    join: (lines: readonly string[]) => lines.join(" · "),
  },
};

export type BooksWords = typeof en;

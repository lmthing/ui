export const words = {
  taxYear: {
    from: (date: string) => `From ${date}`,
    to: (date: string) => `To ${date}`,
    due: (date: string) => `Due ${date}`,
    receiptTotal: (value: string) => `Receipts ${value}`,
    allocationTotal: (value: string) => `Assigned share ${value}`,
    receipts: "Receipts",
    assigned: "Assigned share",
    empty: "No linked evidence yet",
    success: "All evidence collected",
    progress: "Requirements met",
    matched: (count: string) => count,
    needed: (count: string) => ` of ${count} found`,
    missing: (count: string) => `${count} missing`,
    source: { documents: "Documents", receipts: "Reviewed receipts" },
    sourceTag: (source: string, tag: string) => `${source} · ${tag}`,
    rowReading: (label: string, matched: string, needed: string, missing: string) =>
      `${label}: ${matched}${needed}${missing ? `, ${missing}` : ""}`,
  },
};

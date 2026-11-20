export const en = {
  rentRoll: {
    assessed: "Assessed",
    received: "Received",
    outstanding: "Outstanding",
    arrears: "Arrears",
    amount: "Charge",
    paid: "Paid",
    credit: "Credit",
    due: (date: string) => `Due ${date}`,
    method: { cash: "Cash", transfer: "Transfer", card: "Card" },
    receipts: "Receipts",
    record: "Record receipt",
    remind: "Remind",
    void: "Void",
    voided: "Voided",
    success: "Receipt recorded",
    error: "Rent ledger update failed",
    noCharges: "No charges for this view",
    rowReading: (id: string, fields: readonly string[]) => `${id} ${fields.join(" · ")}`,
    summaryReading: (month: string, values: readonly string[]) => `${month} · ${values.join(" · ")}`,
    metricReading: (label: string, value: string, upper = false) =>
      `${upper ? label : label.toLowerCase()} ${value}`,
  },
};

export type PropertyWords = typeof en;

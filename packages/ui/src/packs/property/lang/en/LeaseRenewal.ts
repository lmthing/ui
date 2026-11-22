import type { LDMLPluralRule } from "../../../../catalog";

export const words = {
  renewals: {
    success: "Response recorded",
    error: "Couldn’t save the response",
    expired: "The response deadline has passed",
    statuses: {
      sent: "Awaiting response",
      accepted: "Accepted",
      countered: "Countered",
      declined: "Declined",
    },
    options: "Renewal terms",
    proposed: "Proposed rent",
    monthly: "per month",
    proposedReading: (money: string) => `${money} per month`,
    current: (money: string) => `Current rent · ${money}`,
    change: (money: string, percent: string) => `${money} (${percent}) from current rent`,
    unchanged: "No change from current rent",
    deadline: (date: string) => `Respond by ${date}`,
    selectedTerm: (label: string) => `Selected term · ${label}`,
    rolling: "Rolling term",
    fixed: (count: string, form: LDMLPluralRule) =>
      `Fixed for ${count} ${form === "one" ? "month" : "months"}`,
    chosen: (label: string) => `${label} · Selected`,
    optionReading: (id: string, title: string, money: string, sub?: string) =>
      [id, title, money, sub].filter(Boolean).join(" · "),
    note: "Counter-proposal note",
    accept: "Accept",
    counter: "Counter",
    decline: "Decline",
  },
};

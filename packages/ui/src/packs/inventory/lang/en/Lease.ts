export const words = {
  lease: {
    open: (place: string) => `Open lease for ${place}`,
    tenant: (name: string) => `Tenant: ${name}`,
    start: (date: string) => `Starts ${date}`,
    end: (date: string) => `Ends ${date}`,
    timeLeft: "Time left",
    timeReading: (amount: string) => `Time left: ${amount}`,
    remaining: (count: string, form: Intl.LDMLPluralRule) => `${count} ${form === "one" ? "day" : "days"}`,
    rent: (amount: string, per: "month" | "week") => ["Rent ", amount, `\u00a0/\u00a0${per}`] as const,
    nextDue: (date: string) => `Next due ${date}`,
    noDue: "No further rent dates",
    deposit: (amount: string) => ["Deposit ", amount] as const,
    renewal: { soon: "Renewal soon", endsToday: "Lease ends today", ended: "Lease ended" },
  },
};

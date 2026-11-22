export const words = {
  vitalPair: (value: string) => ` / ${value}`,
  vitalUnit: (unit: string, value?: string) => (value === undefined ? unit : `/ ${value} ${unit}`),
  // prettier-ignore
  vitalReading: (label: string, value: string, unit: string, range: string, status: string, at?: string, context?: string) =>
    `${label}: ${value} ${unit} · ${range} · ${status}${at === undefined ? "" : ` · ${at}`}${context === undefined ? "" : ` · ${context}`}`,
  vitalLabels: {
    add: "Add reading",
    context: { resting: "Resting", fasting: "Fasting", post_meal: "After a meal", active: "Active" },
    outside: "Outside range",
    normal: "In range",
    systolic: (status: string) => `Systolic: ${status}`,
    range: (low: string, high: string, paired: boolean) =>
      `${paired ? "Systolic reference" : "Reference"} ${low}–${high}`,
  },
};

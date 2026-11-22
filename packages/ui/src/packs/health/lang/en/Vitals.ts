export const words = {
  vitalPair: (value: string) => ` / ${value}`,
  vitalUnit: (unit: string, value?: string) => (value === undefined ? unit : `/ ${value} ${unit}`),
  vitalReading: (label: string, value: string, unit: string, range: string, status: string, at?: string) =>
    `${label}: ${value} ${unit} · ${range} · ${status}${at === undefined ? "" : ` · ${at}`}`,
  vitalLabels: {
    add: "Add reading",
    outside: "Outside range",
    normal: "In range",
    systolic: (status: string) => `Systolic: ${status}`,
    range: (low: string, high: string, paired: boolean) =>
      `${paired ? "Systolic reference" : "Reference"} ${low}–${high}`,
  },
};

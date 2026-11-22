export const words = {
  fieldToggle: { on: "on", off: "off" },
  fieldChoiceError: "Choose an available field option",
  fieldDateError: "Use a real date in YYYY-MM-DD",
  fieldTimeError: "Use a time in HH:MM",
  fieldValueError: "The value does not fit this field",
  repeatLabels: {
    never: "Never",
    daily: "Daily",
    weekdays: "Weekdays",
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
  },
  fieldRange: {
    lower: (label: string) => `${label}, minimum`,
    upper: (label: string) => `${label}, maximum`,
    reading: (lower: string, upper: string) => `${lower} to ${upper}`,
  },
};

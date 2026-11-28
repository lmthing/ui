export const words = {
  fieldToggle: { on: "on", off: "off" },
  fieldChoiceError: "Choose an available field option",
  fieldDateError: "Use a real date in YYYY-MM-DD",
  fieldTimeError: "Use a time in HH:MM",
  fieldValueError: "The value does not fit this field",
  fieldAttachment: {
    pick: "Choose file",
    replace: "Replace file",
    remove: "Remove file",
    pending: "Adding file…",
    ready: "File attached",
    error: "Couldn’t attach file. Try again.",
  },
  fieldPassword: {
    show: "Show",
    hide: "Hide",
    showLabel: "Show password",
    hideLabel: "Hide password",
  },
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

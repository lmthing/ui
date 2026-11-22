export const coreOptions = {
  composer: {
    attach: "Add attachment",
    voice: "Record voice",
    sent: "Sent",
    replying: (name: string) => `Replying to ${name}`,
    prompt: "Run prompt",
  },
  fieldRange: {
    lower: (label: string) => `${label}, minimum`,
    upper: (label: string) => `${label}, maximum`,
    reading: (lower: string, upper: string) => `${lower} to ${upper}`,
  },
  calendarRange: {
    start: "Check-in",
    end: "Check-out",
    chooseStart: "Choose check-in",
    chooseEnd: "Choose check-out",
    inside: "In selected range",
    unavailable: "Unavailable",
    day: (month: string, day: string) => `${month} ${day}`,
    label: (date: string, state: string) => `${date}, ${state}`,
    endpoint: (label: string, date: string) => `${label}: ${date}`,
  },
  routeModes: { walk: "Walking", bike: "Cycling", car: "Driving", transit: "Transit", flight: "Flight" },
  activeBar: (label: string) => `Current: ${label}`,
};

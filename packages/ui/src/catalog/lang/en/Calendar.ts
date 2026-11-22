export const words = {
  thisMonth: "This month",
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
};

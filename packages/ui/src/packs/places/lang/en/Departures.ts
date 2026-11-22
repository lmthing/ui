export const words = {
  departureDue: "Due",
  departureMinutes: (minutes: string) => `${minutes} min`,
  departureDelay: (minutes: string) => `${minutes} min late`,
  departureLate: (hasTime: boolean) => (hasTime ? " · Late" : "Late"),
  departuresEmpty: "No departures to show",
  departureLabel: (line: string, to: string, time: string, delay?: string) =>
    `Line ${line} to ${to}, ${time}${delay ? `, ${delay}` : ""}`,
  departureReading: (line: string, to: string, time: string, delay?: string) =>
    `${JSON.stringify(line)} to ${JSON.stringify(to)}: ${time}${delay ? `, ${delay}` : ""}`,
};

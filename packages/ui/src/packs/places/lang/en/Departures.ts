export const words = {
  departureDue: "Due",
  departureMinutes: (minutes: string) => `${minutes} min`,
  departureDelay: (minutes: string) => `${minutes} min late`,
  departureLate: (hasTime: boolean) => (hasTime ? " · Late" : "Late"),
  departuresEmpty: "No departures to show",
  departureLabel: (line: string, to: string, time: string, delay?: string, crowding?: string) =>
    `Line ${line} to ${to}, ${[time, delay, crowding].filter(Boolean).join(", ")}`,
  departureReading: (line: string, to: string, time: string, delay?: string, crowding?: string) =>
    `${JSON.stringify(line)} to ${JSON.stringify(to)}: ${[time, delay, crowding].filter(Boolean).join(", ")}`,
  departureAlerts: "Service alerts",
  departureCrowding: { low: "Low crowding", medium: "Medium crowding", high: "High crowding" },
  departureSeverity: { info: "Notice", warn: "Warning", critical: "Critical alert" },
  departureAlert: (line: string, severity: string) => `Line ${line} · ${severity}`,
  departureAlertReading: (title: string, text: string) => `${title}: ${JSON.stringify(text)}`,
};

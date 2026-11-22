export const words = {
  availabilityLabels: {
    from: "From",
    to: "To",
    break: "Break",
    off: (weekday: string) => `${weekday} · Off`,
  },
  availabilityBuffer: (duration: string) => `${duration} between bookings`,
  availabilityOverrides: "Date exceptions",
  availabilityOverride: { blocked: "Blocked", holiday: "Holiday" },
};

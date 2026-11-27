export const words = {
  slotAgenda: {
    available: "Available",
    full: "Full",
    booked: "Booked",
    empty: "No sessions on this date",
    capacity: (cap: string) => `${cap} places`,
    occupancy: (used: string, cap: string) => `${used} of ${cap} places filled`,
  },
};

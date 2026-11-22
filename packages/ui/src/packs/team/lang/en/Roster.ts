export const words = {
  roster: {
    staff: "Staff",
    empty: "No shifts scheduled",
    unassigned: "No station assigned",
    scrollHint: "Scroll sideways for all seven days",
    week: (date: string) => `Week of ${date}`,
    time: (from: string, to: string) => `${from}–${to}`,
    shift: (time: string, role?: string) => (role ? `${time} ${role}` : time),
    shiftLabel: (name: string, day: string, shift: string) => `${name}, ${day}, ${shift}`,
    shiftReading: (day: string, shift: string, id: string) => `${day} ${shift} (${id})`,
    columnsReading: (staff: string, days: string[]) => `${staff} · ${days.join(", ")}`,
    personReading: (name: string, shifts: string[]) =>
      shifts.length ? `${name}: ${shifts.join(", ")}` : name,
    coverReading: (days: string[]) => `No cover: ${days.join(", ")}`,
  },
};

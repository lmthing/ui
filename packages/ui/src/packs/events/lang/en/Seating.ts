export const words = {
  seatPlan: {
    tray: "Unseated guests",
    available: "Available seat",
    count: (occupied: number, capacity: number, lang: string) => {
      const format = new Intl.NumberFormat(lang);
      return `${format.format(occupied)} / ${format.format(capacity)}`;
    },
    move: (guest: string, table: string) => `Move ${guest} to ${table}`,
  },
  seating: {
    title: "Seating plan",
    noGuests: "No guests at this table",
    freeSeat: "Free seat",
    unseated: "Unseated",
    tray: (count: string) => `Unseated · ${count}`,
    figures: (used: string, total: string) => `${used} of ${total}`,
    filled: "seats filled",
    count: (figures: string, label: string) => `${figures} ${label}`,
    table: (id: string, label: string, count: string) => `${id}: ${label} (${count})`,
    guest: (id: string, name: string, label: string, initials?: string) =>
      `${id}: ${name} (${label})${initials ? ` · ${initials}` : ""}`,
    move: (label: string) => `Move to ${label}`,
  },
};

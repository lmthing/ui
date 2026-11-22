export const words = {
  seating: {
    tray: "Unseated guests",
    available: "Available seat",
    count: (occupied: number, capacity: number, lang: string) => {
      const format = new Intl.NumberFormat(lang);
      return `${format.format(occupied)} / ${format.format(capacity)}`;
    },
    move: (guest: string, table: string) => `Move ${guest} to ${table}`,
  },
};

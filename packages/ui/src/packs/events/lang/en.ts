export type EventsWords = typeof en;

export const en = {
  ticket: {
    pass: "Admission ticket",
    stampSeparator: " · ",
    holder: (name: string) => `Ticket holder: ${name}`,
    code: (number: string) => `Admission QR code for ticket ${number}`,
    hint: "Show this code at the door",
    scanned: "Scanned in",
  },
  vendors: {
    roles: {
      venue: "Venue",
      food: "Catering",
      photo: "Photography",
      music: "Music",
      flowers: "Florist",
      cake: "Cake",
      transport: "Transport",
      other: "Supplier",
    },
    booked: "Booked",
    unbooked: "Not booked",
    total: "Total agreed",
    totalPaid: "Total paid",
    totalLeft: "Left to pay",
    cost: "Agreed",
    paid: "Paid",
    balance: "Left",
    due: (date: string) => `Due ${date}`,
    call: (name: string) => `Call ${name}`,
    status: (role: string, booking: string) => `${role} · ${booking}`,
    amount: (label: string, value: string) => `${label}: ${value}`,
  },
};

export const words = {
  ticket: {
    pass: "Admission ticket",
    stampSeparator: " · ",
    holder: (name: string) => `Ticket holder: ${name}`,
    code: (number: string) => `Admission QR code for ticket ${number}`,
    hint: "Show this code at the door",
    scanned: "Scanned in",
  },
};

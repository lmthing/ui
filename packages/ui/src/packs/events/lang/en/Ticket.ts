export const words = {
  ticket: {
    pass: "Admission ticket",
    stampSeparator: " · ",
    holder: (name: string) => `Ticket holder: ${name}`,
    code: (number: string) => `Admission QR code for ticket ${number}`,
    hint: "Show this code at the door",
    scanned: "Scanned in",
    status: { valid: "Valid", transferred: "Transferred", used: "Used" },
    section: (value: string) => `Section ${value}`,
    row: (value: string) => `Row ${value}`,
    seat: (value: string) => `Seat ${value}`,
    transfer: "Transfer ticket",
  },
};

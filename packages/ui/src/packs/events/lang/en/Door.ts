export const words = {
  door: {
    arrivals: "Arrivals",
    count: (arrived: string, expected: string) => `${arrived} of ${expected}`,
    noTotals: "No ticket totals yet",
    scan: "Scan ticket",
    search: "Find a guest by name",
    checkin: "Check in",
    admitted: "Checked in",
    recent: (names: readonly string[]) => `Recent: ${names.join(", ")}`,
    success: "Guest checked in",
    errors: { already_in: "Guest already checked in", not_found: "Ticket not found" },
    noMatch: "No matching guests",
    match: (id: string, name: string, status?: string) => `${id}: ${name}${status ? ` · ${status}` : ""}`,
  },
};

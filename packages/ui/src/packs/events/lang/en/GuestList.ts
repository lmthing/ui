export const words = {
  guestList: {
    counts: "RSVP totals",
    empty: "No guests yet",
    status: { yes: "Coming", no: "Declined", maybe: "Maybe", waiting: "Waiting" },
    stat: (count: string, label: string) => `${count} ${label}`,
    plus: (count: string) => `+${count}`,
    remind: "Remind waiting guests",
    separator: " · ",
    party: (name: string, guests: string[]) => `${name}: ${guests.join("; ")}`,
    guest: (name: string, plus: string | undefined, status: string, diet: string | undefined) =>
      [`${name}${plus ? ` ${plus}` : ""}`, status, diet].filter(Boolean).join(" · "),
  },
};

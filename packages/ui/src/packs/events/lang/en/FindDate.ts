export const words = {
  findDate: {
    people: "People",
    answer: { yes: "Yes", maybe: "Maybe", no: "No", none: "No reply" },
    reply: "Reply",
    noVotes: "No date leads yet",
    best: (slot: string) => `Best fit: ${slot}`,
    guide: "Choose a reply for each date in your row.",
    scroll: "Scroll across to see all dates.",
    dateThing: "date",
    count: (yes: string, maybe: string) => `${yes} yes · ${maybe} maybe`,
    slot: (day: string, time?: string) => (time ? `${day} · ${time}` : day),
    agenda: (slots: readonly string[]) => slots.join("; "),
    person: (name: string, replies: readonly string[]) => `${name}: ${replies.join(" · ")}`,
    cell: (id: string, name: string, slot: string, label?: string) =>
      `${id}: ${name}, ${slot}${label ? ` · ${label}` : ""}`,
  },
};

export const words = {
  loans: {
    way: { lent: "Lent to ", borrowed: "Borrowed from " },
    since: (date: string) => `Since ${date}`,
    due: (date: string) => `Due back ${date}`,
    overdue: "Overdue",
    dueGap: "\u00a0\u00a0\u00a0",
    returned: "Mark returned",
    remind: { lent: (person: string) => `Remind ${person}`, borrowed: () => "Remind me" },
    reading: (fields: string[]) => fields.join(" · "),
  },
};

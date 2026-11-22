export const words = {
  minutes: {
    chair: (name: string) => `Chair: ${name}`,
    approval: (name: string, date: string) => `Approved by ${name} · ${date}`,
    draft: "Awaiting approval",
    present: (names: string) => `Present: ${names}`,
    apologies: (names: string) => `Apologies: ${names}`,
    unlisted: "None listed",
    unresolved: (count: string, form: Intl.LDMLPluralRule) =>
      `${count} ${form === "one" ? "member" : "members"} not in the register`,
    decisions: "Decisions",
    actions: "Follow-up actions",
    motion: "Open motion",
    owner: (name: string) => `Owner: ${name}`,
    due: (date: string) => `Due ${date}`,
    overdue: (date: string) => `Overdue · ${date}`,
    approve: "Approve minutes",
    saved: "Minutes updated",
    error: "Could not save the minutes",
    complete: "Complete",
    incomplete: "Open",
  },
};

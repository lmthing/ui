export const words = {
  teamDirectory: {
    title: "Team directory",
    search: "Search teammates",
    empty: "No matching teammates",
    unassigned: "No teammates in the directory yet",
    other: "Other teammates",
    status: { on_shift: "On shift", break: "On break", pto: "On leave", off: "Off shift" },
    manager: (name: string) => `Reports to ${name}`,
    messagePerson: (name: string) => `Message ${name}`,
    callPerson: (name: string) => `Call ${name}`,
    summary: (id: string, name: string, details: string[]) => `${id} ${name}: ${details.join(" · ")}`,
  },
};

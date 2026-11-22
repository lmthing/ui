export const words = {
  teamPicker: {
    ready: "Ready to split",
    empty: "No teams drawn yet",
    grouped: "Teams are set",
    unassigned: "Unassigned",
    noPlayers: "No players yet",
    error: "Teams can’t be balanced",
    errorDetail: "Change the locked placements before drawing teams.",
    make: "Make teams",
    remake: "Redraw teams",
    lockedName: (name: string) => `${name} (locked)`,
    teamLine: (label: string, count: string, names: readonly string[]) =>
      names.length ? `${label} (${count}): ${names.join(", ")}` : `${label} (${count})`,
  },
};

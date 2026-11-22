import type { DataWords } from "..";

export const words = {
  savedViews: {
    title: "Saved views",
    save: "Save current view",
    remove: (label) => `Remove ${label}`,
    success: "Saved views updated",
    removed: "View removed",
    chip: (label, count) => `${label} · ${count}`,
    matches: (count, form) => (form === "one" ? `${count} match` : `${count} matches`),
    layouts: { table: "Table layout", cards: "Cards layout", board: "Board layout" },
  },
} satisfies Pick<DataWords, "savedViews">;

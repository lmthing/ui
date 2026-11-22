import type { DataWords } from "..";

export const words = {
  activityLabel: (who, text, time, diff) => `${who}: ${text} (${time})${diff ? ` · ${diff}` : ""}`,
  activityDiff: (old, next) => `${old} → ${next}`,
  activityKind: "Filter changes by kind",
  activityKinds: { all: "All changes", created: "Created", updated: "Updated", deleted: "Deleted" },
} satisfies Pick<DataWords, "activityLabel" | "activityDiff" | "activityKind" | "activityKinds">;

import type { DataWords } from "..";

export const words = {
  activityLabel: (who, text, time) => `${who}: ${text} (${time})`,
} satisfies Pick<DataWords, "activityLabel">;

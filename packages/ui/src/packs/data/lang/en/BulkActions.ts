import type { DataWords } from "..";

export const words = {
  bulkSelectAll: "Select all",
  bulkSelected: (count) => `${count} selected`,
} satisfies Pick<DataWords, "bulkSelectAll" | "bulkSelected">;

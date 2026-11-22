import type { DataWords } from "..";

export const words = {
  boardCard: (id, fields) => `${id}: ${fields.filter(Boolean).join(" · ")}`,
  boardDestination: (destination, card) => `Move ${card} to ${destination}`,
  boardMove: "Move to",
  boardStage: (label, count, total) => `${label} (${count}${total ? `, Total ${total}` : ""})`,
  boardTotal: "Total",
  boardStages: "Stages",
  boardUnassigned: "Unassigned",
} satisfies Pick<
  DataWords,
  | "boardCard"
  | "boardDestination"
  | "boardMove"
  | "boardStage"
  | "boardTotal"
  | "boardStages"
  | "boardUnassigned"
>;

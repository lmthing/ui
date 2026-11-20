import type { AxisValue } from "../types";

const card = { surface: "card" } as const;
const ranking = { lead: "number", trail: "value" } as const;
type Axes = { surface?: AxisValue<"surface">; lead?: AxisValue<"lead">; trail?: AxisValue<"trail"> };

export const packListDefaults = {
  "appointments/upcoming": card,
  "food/add": card,
  "invest/simple": card,
  "family/leaders": ranking,
  "score_round/play_results": ranking,
} as const satisfies Record<string, Axes>;

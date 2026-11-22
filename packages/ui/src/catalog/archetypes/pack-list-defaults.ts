import type { AxisValue } from "../types";

const ranking = { lead: "number", trail: "value" } as const;
type Axes = { lead?: AxisValue<"lead">; trail?: AxisValue<"trail"> };

export const packListDefaults = {
  "family/leaders": ranking,
  "score_round/play_results": ranking,
} as const satisfies Record<string, Axes>;

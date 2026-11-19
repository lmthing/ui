import type { AxisValue } from "../types";

const card = { surface: "card" } as const;
const ranking = { lead: "number", trail: "value" } as const;
type Axes = { surface?: AxisValue<"surface">; lead?: AxisValue<"lead">; trail?: AxisValue<"trail"> };

// Pack composition forwards only style and kind from seeds. Share the List axes
// between the authored seeds and default assembly until it can forward axes.
export const packListDefaults = {
  "appointments/upcoming": card,
  "food/add": card,
  "invest/simple": card,
  "family/leaders": ranking,
  "score_round/play_results": ranking,
} as const satisfies Record<string, Axes>;

export function applyPackListDefaults(input: Record<string, unknown>, layout: string): void {
  const axes = (packListDefaults as Readonly<Partial<Record<string, Axes>>>)[layout];
  if (!axes) return;
  Object.assign(input, axes);
  if (axes.trail === "value" && Array.isArray(input.rows)) {
    input.rows = input.rows.map((row: Record<string, unknown>) =>
      row.value ? row : { ...row, trail: "none" },
    );
  }
}

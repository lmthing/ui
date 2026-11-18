import { space } from "../tokens";
import type { Meta } from "../meta";
export function gapBetween(previous: Meta | undefined, next: Meta): number {
  if (!previous) return 0;
  if (previous.id === "SectionTitle") return space.sm;
  if (previous.id === "Hero" || previous.group !== next.group) return space.xl;
  return space.lg;
}

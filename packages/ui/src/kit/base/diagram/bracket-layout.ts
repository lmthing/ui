import { component, size, space } from "../../../catalog";

export const bracketWidth = size.control.md * 4 + space.lg;
export const bracketGap = space["3xl"];
export const bracketTieHeight = size.control.md * 2;
const tieStep = bracketTieHeight + space.lg;

export function bracketLayout(
  rounds: readonly { ties: readonly { id: string; winner?: 0 | 1 }[] }[],
  links: readonly { from: string; to: string }[],
) {
  const height = Math.max(component.base.none, ...rounds.map(({ ties }) => ties.length)) * tieStep;
  const width = rounds.length * (bracketWidth + bracketGap) - bracketGap;
  const locations = new Map<string, { round: number; x: number; y: number; decided: boolean }>();
  const columns = rounds.map(({ ties }, round) =>
    ties.map((tie, index) => {
      const y = ((index + 0.5) * height) / ties.length;
      locations.set(tie.id, {
        round,
        x: round * (bracketWidth + bracketGap),
        y,
        decided: tie.winner !== undefined,
      });
      return y - bracketTieHeight / 2;
    }),
  );
  const paths = links.flatMap(({ from, to }) => {
    const a = locations.get(from);
    const b = locations.get(to);
    if (!a || !b || a.round >= b.round) return [];
    const start = a.x + bracketWidth;
    const out = start + bracketGap / 2;
    const enter = b.x - bracketGap / 2;
    const d =
      out === enter
        ? `M${start} ${a.y}H${out}V${b.y}H${b.x}`
        : `M${start} ${a.y}H${out}V${space.xs}H${enter}V${b.y}H${b.x}`;
    return [{ d, decided: a.decided }];
  });
  // Neutral paths go underneath decided ones where they share a destination.
  return { height, width, columns, paths: paths.sort((a, b) => Number(a.decided) - Number(b.decided)) };
}

import { component, size, space } from "../../../catalog";

export const bracketWidth = size.control.md * 4 + space.lg;
export const bracketGap = space["3xl"];
export const bracketTieHeight = size.control.sm * 2 + space.xs;
const tieStep = bracketTieHeight + space.md;
export const bracketHeadingHeight = size.control.sm + space.xs;
export type BracketWindow = { top: number; height: number };

export function bracketRoundWidth(viewport: number) {
  return Math.max(bracketWidth, viewport - space.md * 2 - space.lg);
}

export function bracketLayout(
  rounds: readonly { ties: readonly { id: string; winner?: 0 | 1 | undefined }[] }[],
  links: readonly { from: string; to: string }[],
  roundWidth = bracketWidth,
) {
  const height = Math.max(component.base.none, ...rounds.map(({ ties }) => ties.length)) * tieStep;
  const step = roundWidth + bracketGap;
  const width = Math.max(component.base.none, rounds.length * step - bracketGap);
  const locations = new Map<string, { round: number; x: number; y: number; decided: boolean }>();
  const columns = rounds.map(({ ties }, round) =>
    ties.map((tie, index) => {
      const y = ((index + 0.5) * height) / ties.length;
      locations.set(tie.id, {
        round,
        x: round * step,
        y,
        decided: tie.winner !== undefined,
      });
      return y - bracketTieHeight / 2;
    }),
  );
  const bounds = columns.map((tops) => ({
    top: tops[0] ?? component.base.none,
    bottom: tops.length ? tops.at(-1)! + bracketTieHeight : height,
  }));
  const paths = links.flatMap(({ from, to }) => {
    const a = locations.get(from);
    const b = locations.get(to);
    if (!a || !b || a.round >= b.round) return [];
    const start = a.x + roundWidth;
    const out = start + bracketGap / 2;
    const enter = b.x - bracketGap / 2;
    for (let round = a.round; round <= b.round; round++) {
      const bound = bounds[round]!;
      bound.top = Math.min(bound.top, bracketHeadingHeight + (out === enter ? Math.min(a.y, b.y) : space.xs));
      bound.bottom = Math.max(bound.bottom, a.y, b.y);
    }
    const d =
      out === enter
        ? `M${start} ${a.y}H${out}V${b.y}H${b.x}`
        : `M${start} ${a.y}H${out}V${space.xs}H${enter}V${b.y}H${b.x}`;
    return [{ d, decided: a.decided }];
  });
  const windows = bounds.map(({ top, bottom }) => {
    const inset = Math.max(component.base.none, top - space.sm);
    return { top: inset, height: bottom + bracketHeadingHeight + space.md * 2 + space.xs - inset };
  });
  // Neutral paths go underneath decided ones where they share a destination.
  return {
    height,
    width,
    columns,
    windows,
    paths: paths.sort((a, b) => Number(a.decided) - Number(b.decided)),
  };
}

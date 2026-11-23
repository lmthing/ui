import { component, size, space } from "../../../catalog";

export const laneHeight = size.control.md;
export const minimumColumn = size.control.lg + space.md;
export const railWidth = size.control.lg * 2;

export function timelineWidth(columns: number, viewport: number) {
  const visible = Math.max(1, Math.min(columns, Math.floor(viewport / minimumColumn)));
  return Math.max(minimumColumn, viewport / visible) * columns;
}

const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value));
const position = (value: number, width: number) => clamp(Number.isFinite(value) ? value : 0, 1) * width;

export function range(start: number, end: number, width: number) {
  const a = position(start, width);
  const b = position(end, width);
  const span = Math.max(Math.abs(b - a), component.base.strongBorder);
  return { left: clamp(Math.min(a, b), width - span), width: span };
}

export function timelineEdges(width: number, viewport: number, scrollX: number) {
  const limit = Math.max(0, width - viewport);
  const start = clamp(scrollX, limit);
  const end = start + viewport;
  return {
    start,
    end,
    left: viewport > 0 && start > component.base.borderWidth,
    right: viewport > 0 && width - end > component.base.borderWidth,
  };
}

export function rangeContinuation(
  row: { left: number; width: number },
  edges: ReturnType<typeof timelineEdges>,
) {
  const end = row.left + row.width;
  return {
    left: edges.left && row.left < edges.start && edges.start < end,
    right: edges.right && row.left < edges.end && edges.end < end,
  };
}

export function hitBox(center: number, width: number, span = 0) {
  const hit = Math.max(size.control.md, span);
  return { left: clamp(center - hit / 2, width - hit), width: hit };
}

export function milestone(at: number, width: number) {
  // Inset the full span so distinct positions remain distinct even near the edges.
  const inset = space.sm / Math.SQRT2;
  return inset + position(at, width - 2 * inset);
}

type Anchor = { left: number; width: number; index: number };

function connectorChannel(from: Anchor, to: Anchor, timeline: number, anchors: readonly Anchor[]) {
  const inset = component.base.strongBorder;
  const preferred = Math.max(inset, Math.min(from.left + from.width + space.xs, timeline - inset));
  const first = Math.min(from.index, to.index);
  const last = Math.max(from.index, to.index);
  const obstacles = anchors.filter(({ index }) => index > first && index < last);
  const candidates = [
    preferred,
    ...obstacles.flatMap(({ left, width }) => [left - space.xs, left + width + space.xs]),
  ];
  const clear = candidates.filter(
    (x) =>
      x >= inset &&
      x <= timeline - inset &&
      obstacles.every(({ left, width }) => x <= left - space.xs || x >= left + width + space.xs),
  );
  return (
    clear.reduce<number | undefined>(
      (nearest, x) =>
        nearest === undefined || Math.abs(x - preferred) < Math.abs(nearest - preferred) ? x : nearest,
      undefined,
    ) ?? (preferred < timeline / 2 ? inset : timeline - inset)
  );
}

export function dependency(from: Anchor, to: Anchor, timeline: number, anchors: readonly Anchor[]) {
  const x = from.left + from.width;
  const y = (from.index + 1.5) * laneHeight;
  const end = to.left + Math.min(to.width / 2, space.sm);
  const center = (to.index + 1.5) * laneHeight;
  const direction = from.index < to.index ? 1 : -1;
  const exit = y + direction * space.sm;
  const departure = exit + direction * space.xs;
  const tip = center - direction * space.sm;
  const approach = tip - direction * space.sm;
  const elbow = connectorChannel(from, to, timeline, anchors);
  const shaft = `M${x} ${exit} V${departure} H${elbow} V${approach} H${end} V${tip}`;
  const head = tip - direction * space.xs;
  const arrow = `M${end - space.xs / 2} ${head} L${end} ${tip} L${end + space.xs / 2} ${head}`;
  return `${shaft} ${arrow}`;
}

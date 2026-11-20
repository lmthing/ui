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

export function hitBox(center: number, width: number, span = 0) {
  const hit = Math.max(size.control.md, span);
  return { left: clamp(center - hit / 2, width - hit), width: hit };
}

export function milestone(at: number, width: number) {
  return Math.max(space.md, Math.min(position(at, width), width - space.md));
}

type Anchor = { left: number; width: number; index: number };

export function dependency(from: Anchor, to: Anchor, timeline: number) {
  const x = from.left + from.width;
  const y = (from.index + 1.5) * laneHeight;
  const end = to.left + Math.min(to.width / 2, space.sm);
  const center = (to.index + 1.5) * laneHeight;
  const direction = from.index < to.index ? 1 : -1;
  const tip = center - direction * space.sm;
  const approach = tip - direction * space.sm;
  const elbow = clamp(x + space.xs, timeline - component.base.strongBorder);
  return `M${x} ${y} H${elbow} V${approach} H${end} V${tip} M${end - space.xs / 2} ${tip - direction * space.xs} L${end} ${tip} L${end + space.xs / 2} ${tip - direction * space.xs}`;
}

import { useState, type ReactNode } from "react";
import { component, size, space } from "../../../catalog";

export type Drawing = { part?: string; loading?: boolean };
export type Target = { item?: string; part: string };
export type Column = { id: string; label: string; header: ReactNode };
export type Cell = { id: string; content: ReactNode; target?: Target; disabled?: boolean };
export type MatrixRow = {
  id: string;
  label: string;
  heading: ReactNode;
  cells: readonly Cell[];
  selected?: boolean;
  target?: Target;
};
export const matrixWidth = size.control.md * 3;
export const headingWidth = size.control.md * 2 + space.xl;

/** Measure unconstrained content on both sides, so pinned labels and scrolling cells share heights. */
export function useMatrixHeights(padding: number) {
  const [heights, setHeights] = useState<Record<string, Record<string, number>>>({});
  return {
    height: (row: string) =>
      Math.max(size.control.md, ...Object.values(heights[row] ?? {}).map((value) => value + padding * 2)),
    measure: (row: string, column: string) => (event: { nativeEvent: { layout: { height: number } } }) => {
      const height = event.nativeEvent.layout.height;
      setHeights((current) =>
        current[row]?.[column] === height
          ? current
          : { ...current, [row]: { ...current[row], [column]: height } },
      );
    },
  };
}

export function matrixKey(event: {
  key: string;
  target: unknown;
  currentTarget: unknown;
  preventDefault(): void;
}) {
  if (event.target !== event.currentTarget) return;
  const node = event.currentTarget as HTMLElement;
  const distance = {
    ArrowLeft: -size.control.md,
    ArrowRight: size.control.md,
    PageUp: -node.clientWidth,
    PageDown: node.clientWidth,
    Home: -node.scrollLeft,
    End: node.scrollWidth - node.scrollLeft,
  }[event.key];
  if (distance !== undefined) {
    event.preventDefault();
    node.scrollBy({ left: distance, top: component.base.none });
  }
}

export function transposeWeek(days: readonly Column[], rows: readonly MatrixRow[]) {
  return {
    columns: rows.map((row) => ({ id: row.id, label: row.label, header: row.heading })),
    rows: days.map((day, index) => ({
      id: day.id,
      label: day.label,
      heading: day.header,
      cells: rows.map((row) => row.cells[index] ?? { id: `${row.id}/${day.id}`, content: null }),
    })),
  };
}

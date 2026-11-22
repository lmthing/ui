import { Children, cloneElement, createContext, isValidElement, useState, type ReactNode } from "react";
import { component, radius, size, space, type KitStyle } from "../../../catalog";
import { KitText, shifted } from "../text";
import { isWeb, type YStackProps } from "tamagui";

export type Drawing = { part?: string; loading?: boolean };
export type Target = { item?: string; part: string };
export type Column = { id: string; label: string; header: ReactNode };
export type Cell = {
  id: string;
  label?: string;
  start?: number;
  span?: number;
  content: ReactNode;
  compactContent?: ReactNode;
  target?: Target;
  disabled?: boolean;
};
export type MatrixRow = {
  id: string;
  label: string;
  heading: ReactNode;
  cells: readonly Cell[];
  selected?: boolean;
  target?: Target;
};
export const scrollColumnWidth = size.control.md * 3;
const fittedColumnMin = size.control.md + space.xs * 2;
export const MatrixSelectionContext = createContext<readonly string[]>([]);

export const fittedTableWidth = (columns: number) => columns * fittedColumnMin;

export function matrixColumnLayout(fit: boolean, heading: boolean, contentWidth = false): YStackProps {
  if (contentWidth)
    return {
      flexShrink: component.base.none,
      minWidth: size.control.md + space.sm * 2,
      maxWidth: heading ? scrollColumnWidth : scrollColumnWidth + size.control.md * 2,
      ...(isWeb ? { width: "max-content" as never } : {}),
    };
  if (!fit) return { width: scrollColumnWidth, flexShrink: component.base.none };
  if (heading) return { flexShrink: component.base.none, maxWidth: scrollColumnWidth };
  // Start at the intrinsic width so a column with more content gets more room than a short one.
  return {
    flexGrow: component.base.bodyFlex,
    flexShrink: component.base.bodyFlex,
    minWidth: fittedColumnMin,
  };
}

export function useCompactMatrix(fit: boolean, measureContents = false) {
  const [width, setWidth] = useState<number>();
  const [heading, setHeading] = useState<number>();
  const measure = (set: (value: number) => void) => (event: { nativeEvent: { layout: { width: number } } }) =>
    set(event.nativeEvent.layout.width);
  return {
    compact: fit && width !== undefined && width < size.control.md * 7,
    available: width !== undefined && heading !== undefined ? width - heading : undefined,
    onLayout: fit || measureContents ? measure(setWidth) : undefined,
    onHeadingLayout: fit || measureContents ? measure(setHeading) : undefined,
  };
}

// Stop on a whole column at the starting edge, but don't narrow the rail past its largest cell.
export function wholeColumnViewport(available: number, widths: readonly number[]) {
  let complete = 0;
  for (const width of widths) {
    if (complete + width > available) break;
    complete += width;
  }
  return complete >= Math.max(...widths) &&
    complete < available &&
    complete < widths.reduce((a, b) => a + b, 0)
    ? complete
    : undefined;
}

export function useColumnViewport(
  columns: readonly Column[],
  available: number | undefined,
  active: boolean,
) {
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const widths = columns.map(({ id }) => sizes[id] ?? 0);
  return {
    width:
      active && available !== undefined && widths.length && widths.every((width) => width > 0)
        ? wholeColumnViewport(available, widths)
        : undefined,
    measure: (id: string) =>
      active
        ? (event: { nativeEvent: { layout: { width: number } } }) => {
            const { width } = event.nativeEvent.layout;
            setSizes((previous) => (previous[id] === width ? previous : { ...previous, [id]: width }));
          }
        : undefined,
  };
}

export function loadingRadius(props: Parameters<typeof loadingGeometry>[0], shift: KitStyle["radiusShift"]) {
  if (props.photo || props.initials || props.shape) {
    if (!props.photo || props.shape === "round" || props.shape === "avatar") return radius.pill;
    return shifted(!props.shape || props.shape === "thumb" ? "sm" : "lg", shift);
  }
  return props.hint || props.label ? shifted("md", shift) : radius.pill;
}
export function disabledContent(content: ReactNode): ReactNode {
  return Children.map(content, (node) => {
    if (
      !isValidElement<{
        children?: ReactNode;
        tone?: string;
        disabled?: boolean;
        hint?: string;
        inactive?: boolean;
      }>(node)
    )
      return node;
    const children = node.props.children;
    return cloneElement(node, {
      ...(node.type === KitText
        ? { tone: "muted" }
        : { disabled: true, ...(node.props.hint !== undefined ? { inactive: true } : {}) }),
      ...(children === undefined
        ? {}
        : {
            children:
              typeof children === "string" || typeof children === "number"
                ? children
                : disabledContent(children),
          }),
    });
  });
}

export function loadingGeometry(props: {
  done?: boolean;
  photo?: string;
  initials?: string;
  shape?: string;
  hint?: string;
  label?: string;
  icon?: string;
  name?: string;
  scale?: "sm" | "md" | "lg";
  compact?: boolean;
  full?: boolean;
}): YStackProps | undefined {
  if (props.name) return { width: size.icon[props.scale ?? "md"], height: size.icon[props.scale ?? "md"] };
  if (props.done !== undefined) return { width: size.control.md, height: size.control.md };
  if (props.photo || props.initials || props.shape) {
    const shape = props.photo ? props.shape : props.shape === "avatar" ? "avatar" : "round";
    const ratio =
      shape === "wide"
        ? component.base.wideRatio
        : shape === "tall"
          ? component.base.tallRatio
          : component.base.bodyFlex;
    if (shape === "wide" || shape === "square" || shape === "tall")
      return { width: "100%", aspectRatio: ratio };
    const width = shape === "avatar" ? size.avatar.lg : size.avatar.md;
    return { width, height: width };
  }
  if (props.hint !== undefined)
    return {
      minHeight: size.control.md + component.base.borderWidth * 2,
      minWidth: size.control.md,
      paddingHorizontal: props.compact ? space.sm : space.md,
    };
  if (props.label || props.icon)
    return {
      minHeight: size.control.md,
      minWidth: size.control.md,
      paddingHorizontal: props.label ? space.lg : space.xs,
      alignSelf: props.full ? "stretch" : "flex-start",
    };
  return undefined;
}

/** Measure unconstrained content on both sides, so pinned labels and scrolling cells share heights. */
export function useMatrixHeights(padding: number) {
  const [heights, setHeights] = useState<Record<string, Record<string, number>>>({});
  return {
    height: (row: string) =>
      Math.max(
        size.control.md,
        ...Object.values(heights[row] ?? {}).map((value) => value + padding * 2 + component.base.borderWidth),
      ),
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

export function matrixKey(
  event: {
    key: string;
    target: unknown;
    currentTarget: unknown;
    preventDefault(): void;
  },
  pages = false,
) {
  if (event.target !== event.currentTarget) return;
  const node = event.currentTarget as HTMLElement;
  const step = pages ? node.clientWidth : size.control.md;
  const distance = {
    ArrowLeft: -step,
    ArrowRight: step,
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

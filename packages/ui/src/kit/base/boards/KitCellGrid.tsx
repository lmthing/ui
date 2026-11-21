import { Check, Circle, Minus, X } from "@tamagui/lucide-icons";
import { XStack, YStack, isWeb } from "tamagui";
import { component, size, space, type as typography } from "../../../catalog";
import { usePart } from "../../part";
import { KitText, type TextTone } from "../text";
import { BoardCell, BoardGrid, type Target } from "./board-navigation";

type CellState = "empty" | "given" | "draft" | "correct" | "present" | "absent" | "conflict";
type Cell = {
  id: string;
  row: number;
  col: number;
  value?: string;
  notes?: readonly string[];
  clue?: string;
  state: CellState;
  selected?: boolean;
  target?: Target;
};
type CellGridProps = {
  part?: string;
  loading?: boolean;
  rows: number;
  cols: number;
  cells: readonly Cell[];
};

const fills = {
  empty: "$surface",
  given: "$raised",
  draft: "$accentSoft",
  correct: "$goodSoft",
  present: "$warnSoft",
  absent: "$raised",
  conflict: "$badSoft",
} as const;

const tones: Record<CellState, TextTone> = {
  empty: "text",
  given: "text",
  draft: "accent",
  correct: "good",
  present: "warn",
  absent: "muted",
  conflict: "bad",
};
const marks = { correct: Check, present: Circle, absent: Minus, conflict: X };
const noteColumns = 3;
const headerHeight = Math.max(size.icon.sm, typography.caption.lineHeight);
const caption = { part: null, role: "caption", lines: 1 } as const;

function CellNotes({ notes }: { notes: readonly string[] }) {
  return (
    <YStack width="100%" alignItems="center">
      {Array.from({ length: Math.ceil(notes.length / noteColumns) }, (_, line) => (
        <XStack key={line} width="100%" justifyContent="space-evenly">
          {notes.slice(line * noteColumns, (line + 1) * noteColumns).map((note, index) => (
            <KitText key={index} {...caption} tone="muted">
              {note}
            </KitText>
          ))}
        </XStack>
      ))}
    </YStack>
  );
}

function CellHeading({ cell }: { cell?: Cell | undefined }) {
  const state = cell?.state ?? "empty";
  const Mark = state in marks ? marks[state as keyof typeof marks] : undefined;
  return (
    <XStack
      position="absolute"
      top={component.base.strongBorder}
      left={space.xs}
      right={space.xs}
      height={headerHeight}
      justifyContent="space-between"
      alignItems="center"
      aria-hidden
    >
      <KitText {...caption} tone="muted">
        {cell?.clue}
      </KitText>
      {Mark && <Mark size={size.icon.sm} color={`$${tones[state]}`} />}
    </XStack>
  );
}

function puzzleLabel(row: number, col: number, cell?: Cell) {
  return [`${row + 1}, ${col + 1}`, cell?.state, cell?.clue, cell?.value || cell?.notes?.join(", ")]
    .filter(Boolean)
    .join(", ");
}

type PuzzleTileProps = {
  row: number;
  col: number;
  cell: Cell | undefined;
  loading: boolean;
  height: number;
  header: boolean;
};
function PuzzleTile({ row, col, cell, loading, height, header }: PuzzleTileProps) {
  const state = cell?.state ?? "empty";
  const selected = !loading && Boolean(cell?.selected);
  return (
    <BoardCell
      cell={{
        row,
        col,
        id: cell?.id,
        target: cell?.target,
        label: loading ? "" : puzzleLabel(row, col, cell),
        loading,
        selected,
        disabled: state === "given" || undefined,
        invalid: state === "conflict" || undefined,
      }}
      width={size.control.md}
      height={height}
      borderWidth={selected ? component.base.strongBorder : component.base.borderWidth}
      borderColor={loading ? "$surface" : selected ? "$accent" : "$line"}
      backgroundColor={loading ? "$line" : fills[state]}
      justifyContent="center"
      alignItems="center"
      paddingTop={header ? headerHeight : undefined}
    >
      {!loading && header && <CellHeading cell={cell} />}
      {!loading &&
        (cell?.value ? (
          <KitText
            part={null}
            role={state === "given" ? "heading" : "body"}
            tone={tones[state]}
            lines={1}
            align="center"
          >
            {cell.value}
          </KitText>
        ) : cell?.notes?.length ? (
          <CellNotes notes={cell.notes} />
        ) : null)}
    </BoardCell>
  );
}

function puzzleRows(rows: number, cols: number, cells: readonly Cell[]) {
  const byRow = Array.from({ length: rows }, () => new Map<number, Cell>());
  for (const cell of cells)
    if (Number.isInteger(cell.col) && cell.col >= 0 && cell.col < cols) byRow[cell.row]?.set(cell.col, cell);
  return byRow.map((row) => Array.from({ length: cols }, (_, col) => row.get(col)));
}

function puzzleGeometry(cells: readonly (readonly (Cell | undefined)[])[]) {
  let header = false;
  let notes = 0;
  for (const row of cells)
    for (const cell of row) {
      if (!cell) continue;
      header ||= Boolean(cell.clue || cell.state in marks);
      if (!cell.value) notes = Math.max(notes, cell.notes?.length ?? 0);
    }
  const content = Math.max(
    typography.heading.lineHeight,
    Math.ceil(notes / noteColumns) * typography.caption.lineHeight,
  );
  const height = Math.max(
    size.control.md,
    content + (header ? headerHeight : 0) + component.base.strongBorder * 2,
  );
  return { height, header };
}

/** Draws a coordinate grid; the caller evaluates and updates its contents. */
export function KitCellGrid({ part = "root", rows, cols, cells, loading = false }: CellGridProps) {
  const address = usePart(part);
  const drawing = puzzleRows(rows, cols, cells);
  const geometry = puzzleGeometry(drawing);
  const positions = drawing.flatMap((line, row) => line.map((_, col) => ({ row, col })));
  return (
    <YStack {...address} width="100%" minWidth={component.base.none} aria-busy={loading || undefined}>
      {rows > 0 && cols > 0 && (
        <BoardGrid rows={rows} cols={cols} positions={positions} loading={loading}>
          {drawing.map((line, row) => (
            <XStack key={row} {...(isWeb && !loading ? { role: "row" } : {})}>
              {line.map((cell, col) => (
                <PuzzleTile key={col} {...{ row, col, cell, loading, ...geometry }} />
              ))}
            </XStack>
          ))}
        </BoardGrid>
      )}
    </YStack>
  );
}

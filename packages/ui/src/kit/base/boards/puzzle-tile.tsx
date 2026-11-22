import { Check, Circle, Minus, X } from "@tamagui/lucide-icons";
import { XStack, YStack } from "tamagui";
import { component, size, space, type as typography } from "../../../catalog";
import { KitText, type TextTone } from "../text";
import { BoardCell, type Target } from "./board-navigation";
import { BoardGlyph, type BoardMark } from "./board-mark";

type CellState = "empty" | "given" | "draft" | "correct" | "present" | "absent" | "conflict" | "blocked";
export type Cell = {
  id: string;
  row: number;
  col: number;
  value?: string;
  notes?: readonly string[];
  clue?: string;
  mark?: BoardMark;
  state: CellState;
  selected?: boolean;
  target?: Target;
};

const fills = {
  empty: "$surface",
  given: "$raised",
  draft: "$accentSoft",
  correct: "$goodSoft",
  present: "$warnSoft",
  absent: "$raised",
  conflict: "$badSoft",
  blocked: "$line",
} as const;

const tones: Record<CellState, TextTone> = {
  empty: "text",
  given: "text",
  draft: "accent",
  correct: "good",
  present: "warn",
  absent: "muted",
  conflict: "bad",
  blocked: "muted",
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
  return [
    `${row + 1}, ${col + 1}`,
    cell?.state,
    cell?.clue,
    cell?.value || cell?.notes?.join(", "),
    cell?.mark?.label,
  ]
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
  rowOffset: number;
  colOffset: number;
};
export function PuzzleTile({
  row,
  col,
  cell,
  loading,
  height,
  header,
  rowOffset,
  colOffset,
}: PuzzleTileProps) {
  const state = cell?.state ?? "empty";
  const selected = !loading && Boolean(cell?.selected);
  return (
    <BoardCell
      cell={{
        row: row + rowOffset,
        col: col + colOffset,
        id: cell?.id,
        target: cell?.target,
        label: loading ? "" : puzzleLabel(row, col, cell),
        loading,
        selected,
        disabled: state === "given" || state === "blocked" || undefined,
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
      {!loading && cell?.mark && <BoardGlyph mark={cell.mark} />}
    </BoardCell>
  );
}

export function puzzleGeometry(cells: readonly (readonly (Cell | undefined)[])[]) {
  let header = false;
  let notes = 0;
  let mark = false;
  for (const row of cells)
    for (const cell of row) {
      if (!cell) continue;
      header ||= Boolean(cell.clue || cell.state in marks);
      mark ||= Boolean(cell.mark);
      if (!cell.value) notes = Math.max(notes, cell.notes?.length ?? 0);
    }
  const content = Math.max(
    typography.heading.lineHeight,
    Math.ceil(notes / noteColumns) * typography.caption.lineHeight,
  );
  const height = Math.max(
    size.control.md,
    content + (header ? headerHeight : 0) + (mark ? size.icon.sm : 0) + component.base.strongBorder * 2,
  );
  return { height, header };
}

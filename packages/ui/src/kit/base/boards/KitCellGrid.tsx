import { XStack, YStack, isWeb } from "tamagui";
import { component } from "../../../catalog";
import { usePart } from "../../part";
import { BoardGrid } from "./board-navigation";
import { AxisClue, ColumnClues, axisClues, type AxisClues } from "./axis-clues";
import { PuzzleTile, puzzleGeometry, type Cell } from "./puzzle-tile";

type CellGridProps = {
  part?: string;
  loading?: boolean;
  rows: number;
  cols: number;
  cells: readonly Cell[];
  clues?: AxisClues;
};

function puzzleRows(rows: number, cols: number, cells: readonly Cell[]) {
  const byRow = Array.from({ length: rows }, () => new Map<number, Cell>());
  for (const cell of cells)
    if (Number.isInteger(cell.col) && cell.col >= 0 && cell.col < cols) byRow[cell.row]?.set(cell.col, cell);
  return byRow.map((row) => Array.from({ length: cols }, (_, col) => row.get(col)));
}

/** Draws a coordinate grid; the caller evaluates and updates its contents. */
export function KitCellGrid({ part = "root", rows, cols, cells, clues, loading = false }: CellGridProps) {
  const address = usePart(part);
  const drawing = puzzleRows(rows, cols, cells);
  const geometry = puzzleGeometry(drawing);
  const left = axisClues(clues?.rows, rows);
  const top = axisClues(clues?.columns, cols);
  const colOffset = Number(Boolean(left));
  const rowOffset = Number(Boolean(top));
  const positions = drawing.flatMap((line, row) =>
    line.map((_, col) => ({ row: row + rowOffset, col: col + colOffset })),
  );
  return (
    <YStack {...address} width="100%" minWidth={component.base.none} aria-busy={loading || undefined}>
      {rows > 0 && cols > 0 && (
        <BoardGrid rows={rows + rowOffset} cols={cols + colOffset} positions={positions} loading={loading}>
          {top && <ColumnClues clues={top} corner={Boolean(left)} loading={loading} />}
          {drawing.map((line, row) => (
            <XStack key={row} {...(isWeb && !loading ? { role: "row" } : {})}>
              {left && <AxisClue label={left[row] ?? null} height={geometry.height} loading={loading} />}
              {line.map((cell, col) => (
                <PuzzleTile key={col} {...{ row, col, cell, loading, rowOffset, colOffset, ...geometry }} />
              ))}
            </XStack>
          ))}
        </BoardGrid>
      )}
    </YStack>
  );
}

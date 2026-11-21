import { digitsLine, numberLine } from "../../../catalog";
import { dataWordsFor } from "../lang";

type HeatInput = {
  style: "weeks" | "hours";
  unit: string;
  weeks?: readonly (readonly number[])[] | undefined;
  days?: readonly (readonly number[])[] | undefined;
};

function matrixOf({ style, weeks, days }: HeatInput): readonly (readonly number[])[] {
  const matrix = (style === "weeks" ? weeks : days) ?? [];
  if (style === "hours") return matrix;
  return Array.from({ length: matrix[0]?.length ?? 0 }, (_, day) => matrix.map((week) => week[day]!));
}

export function heatCells(input: HeatInput) {
  return matrixOf(input).flatMap((row, y) =>
    row.map((value, x) => ({ id: cellId(y, x, row.length), value })),
  );
}

const cellId = (row: number, column: number, width: number) => `r${row * width + column + 1}`;

function scale(values: readonly number[], lang?: string) {
  const low = Math.min(0, ...values);
  const high = Math.max(...values);
  const span = high - low;
  // Halve before subtracting only when the full span would overflow a finite number.
  const divisor = Number.isFinite(span) ? 1 : 2;
  const level = (value: number) =>
    span ? (value / divisor - low / divisor) / (high / divisor - low / divisor) : 0;
  const middle = Number.isFinite(span) ? low + span / 2 : low / 2 + high / 2;
  const ticks = new Set([low, middle, high]);
  return {
    level,
    legend: [...ticks].map((value) => ({ level: level(value), label: numberLine(value, lang) })),
  };
}

function heatAxes(input: HeatInput, lang?: string) {
  const words = dataWordsFor(lang);
  const matrix = matrixOf(input);
  const slot = (x: number, short?: boolean) =>
    input.style === "weeks"
      ? words.heatWeek(numberLine(x + 1, lang), short)
      : words.heatHour(digitsLine(x * 2, 2, lang), short);
  const columns = (matrix[0] ?? []).map((_, x) => ({ id: String(x), label: slot(x, true) }));
  return { columns, matrix, slot, ...scale(matrix.flat(), lang) };
}

export function heatGrid(input: HeatInput, lang?: string) {
  const words = dataWordsFor(lang);
  const { columns, matrix, slot, level, legend } = heatAxes(input, lang);
  const slots = columns.map((_, x) => slot(x));
  const rows = matrix.map((row, y) => ({
    id: String(y),
    label: words.heatDay(y, true),
    cells: row.map((value, x) => ({
      id: cellId(y, x, row.length),
      level: level(value),
      label: words.heatValue(words.heatDay(y), slots[x]!, numberLine(value, lang), input.unit),
    })),
  }));
  return { columns, rows, legend };
}

export function heatReading(input: HeatInput, lang?: string): string[] {
  const words = dataWordsFor(lang);
  const { columns, matrix, legend } = heatAxes(input, lang);
  return [
    words.heatReading(
      words.heatLegend(input.unit),
      legend.map(({ label }) => label),
    ),
    columns.map(({ label }) => label).join(" · "),
    ...matrix.map((row, day) =>
      words.heatReading(
        words.heatDay(day),
        row.map((value) => numberLine(value, lang)),
      ),
    ),
  ];
}

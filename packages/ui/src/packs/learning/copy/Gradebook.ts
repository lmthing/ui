import { appointmentDate, localeOf, numberLine, type Meta, type Values } from "../../../catalog";
import { learningWordsFor } from "../lang";

type GradeItem = {
  title: string;
  earned?: number | undefined;
  possible: number;
  date?: string | undefined;
  goto?: string | undefined;
};
type GradeRow = { id?: string; label: string; weight: number; items: GradeItem[]; expanded?: boolean };
type Grades = {
  categories: GradeRow[];
  scale?: "percent" | "letter" | "gpa";
  style?: "categories" | "summary";
  detail?: "full" | "brief";
};

/** Ungraded work does not count as zero. Normalize before summing to keep large point totals finite. */
function categoryRatio(row: GradeRow): number | undefined {
  const assessed = row.items.filter((item) => item.earned !== undefined);
  if (!assessed.length) return;
  const max = Math.max(...assessed.map((item) => item.possible));
  const earned = assessed.reduce((sum, item) => sum + item.earned! / max, 0);
  const possible = assessed.reduce((sum, item) => sum + item.possible / max, 0);
  return earned / possible;
}

function percent(ratio: number, lang?: string) {
  return new Intl.NumberFormat(localeOf(lang), { style: "percent", maximumFractionDigits: 1 }).format(ratio);
}

export function categoryGrade(row: GradeRow, lang?: string) {
  const words = learningWordsFor(lang).gradebook;
  const ratio = categoryRatio(row);
  return {
    ratio,
    label: words.weight(row.label, percent(row.weight / 100, lang)),
    amount: ratio === undefined ? words.ungraded : percent(ratio, lang),
  };
}

function courseRatio(categories: GradeRow[]): number | undefined {
  let weighted = 0;
  let weight = 0;
  for (const row of categories) {
    const ratio = categoryRatio(row);
    if (ratio === undefined || row.weight === 0) continue;
    weighted += row.weight * ratio;
    weight += row.weight;
  }
  return weight ? weighted / weight : undefined;
}

function gradeFigures(ratio: number, scale: Grades["scale"], lang?: string) {
  const words = learningWordsFor(lang).gradebook;
  const band = [0.9, 0.8, 0.7, 0.6, 0].findIndex((floor) => ratio + Number.EPSILON >= floor);
  const figures = {
    percent: percent(ratio, lang),
    letter: words.letter[band]!,
    gpa: words.gpa(new Intl.NumberFormat(localeOf(lang), { minimumFractionDigits: 2 }).format(4 - band)),
  };
  const selected = scale ?? "percent";
  return {
    primary: figures[selected],
    secondary: words.figures(
      Object.entries(figures).flatMap(([key, value]) => (key === selected ? [] : [value])),
    ),
  };
}

export function courseGrade({ categories, scale }: Grades, lang?: string) {
  const ratio = courseRatio(categories);
  return ratio === undefined ? undefined : gradeFigures(ratio, scale, lang);
}

export function gradeItemCopy(item: GradeItem, detail: Grades["detail"], lang?: string) {
  const words = learningWordsFor(lang).gradebook;
  return {
    score:
      item.earned === undefined
        ? words.ungraded
        : words.score(numberLine(item.earned, lang), numberLine(item.possible, lang)),
    date: item.date && detail !== "brief" ? appointmentDate(item.date, lang) : undefined,
  };
}

export function projectGradebook(value: Readonly<Values>, parts: readonly string[]): Values {
  const { categories, style } = value as Grades;
  if (!categories) return {};
  const overallRatio = courseRatio(categories);
  const breakdown = style !== "summary" && overallRatio !== undefined;
  return {
    overallRatio,
    breakdown,
    categories: categories.map((row) => ({
      ...row,
      ...Object.fromEntries(
        parts.map((part, index) => {
          const item = row.items[index];
          return [part, breakdown && row.expanded && item?.goto ? item : undefined];
        }),
      ),
    })),
  };
}

export const gradebookRead: NonNullable<Meta["read"]> = (input, state, lang) => {
  if (state !== "filled") return [];
  const value = input as Grades & { overallRatio?: number };
  const words = learningWordsFor(lang).gradebook;
  const ratio = value.overallRatio ?? courseRatio(value.categories);
  if (ratio === undefined) return [words.empty];
  const grade = gradeFigures(ratio, value.scale, lang);
  const breakdown = value.categories.flatMap((row) => {
    const { label, amount } = categoryGrade(row, lang);
    return [
      words.categoryReading(label, amount),
      ...(row.expanded
        ? row.items.map((item) => {
            const { score, date } = gradeItemCopy(item, value.detail, lang);
            return words.itemReading(item.title, score, date);
          })
        : []),
    ];
  });
  return [grade.primary, grade.secondary, ...(value.style === "summary" ? [] : breakdown)];
};

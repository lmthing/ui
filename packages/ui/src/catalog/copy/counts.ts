import { numberLine, percentageLine } from "../format";
import { wordsFor } from "../lang";

export function goalLine(of: number, lang?: string): string {
  return wordsFor(lang).goal(numberLine(of, lang));
}

export function stepLine(at: number, count: number, lang?: string): string {
  return wordsFor(lang).step(numberLine(at, lang), numberLine(count, lang));
}

export function totalLine(total: number, unit?: string, lang?: string): string {
  return wordsFor(lang).total(numberLine(total, lang), unit);
}

export function trendWord(points: readonly number[], lang?: string): string {
  const [first, last] = [points[0] ?? 0, points[points.length - 1] ?? 0];
  return wordsFor(lang).trend[last > first ? "rising" : last < first ? "falling" : "steady"];
}

export const { stepLabels, messageLabels } = wordsFor();

export function moreLine(count: number, lang?: string): string {
  return wordsFor(lang).more(numberLine(count, lang));
}

export function percentLine(value: number, total: number, lang?: string): string {
  return percentageLine(total > 0 ? Math.round((value / total) * 100) : 0, lang);
}

type ListDetail = {
  id?: string | undefined;
  unread?: boolean | undefined;
  pinned?: boolean | undefined;
  progress?: number | undefined;
};

export function listDetailLines(rows: readonly ListDetail[], lang?: string): string[] {
  const w = wordsFor(lang).listLabels;
  return rows.flatMap(({ id, unread, pinned, progress }, i) => {
    const shown = [
      unread && w.unread,
      pinned && w.pinned,
      progress !== undefined && `${w.progress}: ${percentLine(progress, 1, lang)}`,
    ].filter(Boolean);
    return shown.length ? [`${id ?? `r${i + 1}`} ${shown.join(" · ")}`] : [];
  });
}

export function badgeLine(count: number, lang?: string): string {
  return count > 99 ? wordsFor(lang).badgeOverflow(numberLine(99, lang)) : numberLine(count, lang);
}

export const stampLine = (stamps: number, of: number, lang?: string): string =>
  `${numberLine(stamps, lang)} ${goalLine(of, lang)}`;

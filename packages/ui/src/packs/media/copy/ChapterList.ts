import { clockLine } from "../../../catalog";
import { mediaWordsFor } from "../lang";

type Chapter = { title: string; at: number };

export function chapterReading(
  { chapters, current }: { chapters: readonly Chapter[]; current?: number | undefined },
  lang?: string,
): string[] {
  const { chapterList } = mediaWordsFor(lang);
  return chapters.map(({ at, title }, index) =>
    chapterList.line(clockLine(at, lang), title, index === current),
  );
}

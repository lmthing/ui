import { percentLine } from "../../../catalog";
import { mediaWordsFor } from "../lang";

export function libraryProgress(progress: number, lang?: string): string {
  return percentLine(progress, 1, lang);
}

export function libraryReading(
  items: readonly { title: string; progress?: number | undefined }[],
  lang?: string,
) {
  const { progressReading } = mediaWordsFor(lang).library;
  return items.flatMap(({ title, progress }) =>
    progress === undefined ? [] : [progressReading(title, libraryProgress(progress, lang))],
  );
}

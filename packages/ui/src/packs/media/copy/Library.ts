import { percentLine } from "../../../catalog";
import { mediaWordsFor } from "../lang";

export function libraryProgress(progress: number, lang?: string): string {
  return percentLine(progress, 1, lang);
}

export const libraryStatuses = ["owned", "borrowed", "hold", "finished"] as const;
type Status = (typeof libraryStatuses)[number];
type SavedTitle = {
  title: string;
  progress?: number | undefined;
  status?: Status | undefined;
  dueLabel?: string | undefined;
};

export function libraryStatus(status: Status | undefined, lang?: string) {
  return status && mediaWordsFor(lang).library.status[status];
}

export function libraryReading(items: readonly SavedTitle[], lang?: string) {
  const { progressReading, loanReading } = mediaWordsFor(lang).library;
  return items.flatMap(({ title, progress, status, dueLabel }) => [
    ...(progress === undefined ? [] : [progressReading(title, libraryProgress(progress, lang))]),
    ...(status ? [loanReading(title, libraryStatus(status, lang)!)] : []),
    ...(dueLabel ? [loanReading(title, dueLabel)] : []),
  ]);
}

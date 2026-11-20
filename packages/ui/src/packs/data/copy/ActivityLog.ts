import { dataWordsFor } from "../lang";

export function activityLabel(
  { who, text, time }: { who: string; text: string; time: string },
  lang?: string,
): string {
  return dataWordsFor(lang).activityLabel(who, text, time);
}

import { clockLine, remainingLine } from "../../../catalog";
import { mediaWordsFor } from "../lang";

export function miniPlayerTiming({ at, seconds }: { at: number; seconds: number }, lang?: string): string {
  return mediaWordsFor(lang).miniPlayer.timing(clockLine(at, lang), remainingLine(seconds - at, lang));
}

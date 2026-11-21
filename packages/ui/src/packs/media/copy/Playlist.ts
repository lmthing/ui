import { clockLine, percentLine } from "../../../catalog";
import { mediaWordsFor } from "../lang";

type Recording = { title: string; seconds: number; played: number };

export function playlistTiming(seconds: number, played: number, lang?: string): string {
  const words = mediaWordsFor(lang).playlist;
  const position = played === 1 ? words.completed : words.position(percentLine(played, 1, lang));
  return words.timing(clockLine(seconds, lang), position);
}

export function playlistReading(
  { items, playing }: { items: readonly Recording[]; playing?: number | undefined },
  lang?: string,
): string[] {
  const words = mediaWordsFor(lang).playlist;
  const current = playing === undefined ? undefined : items[playing];
  return [
    ...(current ? [words.nowPlaying(current.title)] : []),
    ...items.map(({ title, seconds, played }) =>
      words.timingReading(title, playlistTiming(seconds, played, lang)),
    ),
  ];
}

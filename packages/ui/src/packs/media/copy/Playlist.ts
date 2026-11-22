import { clockLine, percentLine } from "../../../catalog";
import { mediaWordsFor } from "../lang";

type Recording = { title: string; seconds: number; played: number };
type Queue = { items: readonly Recording[]; playing?: number | undefined; style?: string | undefined };

export function playlistNext({ items, style, playing }: Queue): number {
  return style === "queue" ? (playing ?? -1) + 1 : items.length;
}

export function playlistTiming(seconds: number, played: number, lang?: string): string {
  const words = mediaWordsFor(lang).playlist;
  const position = played === 1 ? words.completed : words.position(percentLine(played, 1, lang));
  return words.timing(clockLine(seconds, lang), position);
}

export function playlistReading(input: Queue, lang?: string): string[] {
  const { items, playing } = input;
  const next = playlistNext(input);
  const words = mediaWordsFor(lang).playlist;
  const current = playing === undefined ? undefined : items[playing];
  return [
    ...(current ? [words.nowPlaying(current.title)] : []),
    ...items.flatMap(({ title, seconds, played }, index) => [
      ...(index === next ? [words.upNext] : []),
      words.timingReading(title, playlistTiming(seconds, played, lang)),
    ]),
  ];
}

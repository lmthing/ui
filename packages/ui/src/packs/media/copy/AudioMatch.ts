import type { StateName } from "../../../catalog";
import { mediaWordsFor } from "../lang";

export function audioMatchReading(
  {
    match,
    phase,
    hasExternalTrack,
    history,
  }: {
    match?: { title: string; artist: string; album?: string | undefined };
    phase?: "idle" | "listening" | "matching" | "matched" | "error";
    hasExternalTrack?: boolean;
    history?: readonly unknown[];
  },
  state: StateName,
  lang?: string,
): string[] {
  const words = mediaWordsFor(lang).audioMatch;
  if (state === "empty") return [words.empty];
  const historyHeading = history?.length ? [words.recent] : [];
  if (phase === "listening") return [words.listening, words.stop];
  if (phase === "matching") return [words.matching, ...historyHeading];
  if (phase === "error") return [words.error, words.retry, ...historyHeading];
  if (match)
    return [
      words.success,
      words.track(match.title, match.artist, match.album),
      ...(hasExternalTrack ? [words.open] : []),
      words.again,
      ...historyHeading,
    ];
  return [words.title, words.start, ...historyHeading];
}

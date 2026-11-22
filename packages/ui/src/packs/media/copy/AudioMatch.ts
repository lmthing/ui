import { mediaWordsFor } from "../lang";

export function audioMatchReading(
  match: { title: string; artist: string; album?: string | undefined } | undefined,
  lang?: string,
): string[] {
  return match ? [mediaWordsFor(lang).audioMatch.track(match.title, match.artist, match.album)] : [];
}

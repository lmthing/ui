import { clockLine } from "../../../catalog";
import { mediaWordsFor } from "../lang";

type Reading = {
  lines: readonly { at: number; text: string; speaker?: string | undefined }[];
  current?: number | undefined;
  playhead?: number | undefined;
  follow: boolean;
};

export function transcriptReading({ lines, current, playhead, follow }: Reading, lang?: string) {
  const words = mediaWordsFor(lang).transcript;
  const active =
    playhead === undefined ? current : lines.reduce((last, { at }, i) => (at <= playhead ? i : last), -1);
  return [
    follow ? words.following : words.notFollowing,
    ...lines.map(({ at, speaker, text }, i) => words.line(clockLine(at, lang), speaker, text, i === active)),
  ];
}

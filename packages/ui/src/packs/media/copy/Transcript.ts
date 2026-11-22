import { clockLine, type Values } from "../../../catalog";
import { mediaWordsFor } from "../lang";

type Reading = {
  lines: readonly { at: number; text: string; speaker?: string | undefined }[];
  current?: number | undefined;
  playhead?: number | undefined;
  follow: boolean;
};

export function activeTranscriptIndex({ lines, current, playhead }: Omit<Reading, "follow">) {
  if (playhead === undefined) return current ?? -1;
  for (let i = lines.length - 1; i >= 0; i--) if (lines[i]!.at <= playhead) return i;
  return -1;
}

/** Timestamp identifies the line within a transcript. Include a revision for replaced text. */
export function transcriptLineIdentity({ at, speaker, text }: Readonly<Values>) {
  if (typeof at !== "number" || typeof text !== "string") return;
  const content = JSON.stringify([speaker, text]);
  let revision = 2166136261;
  for (let i = 0; i < content.length; i++) revision = Math.imul(revision ^ content.charCodeAt(i), 16777619);
  return `${at}:${revision >>> 0}`;
}

export function transcriptReading(input: Reading, lang?: string) {
  const words = mediaWordsFor(lang).transcript;
  const { follow, lines } = input;
  const active = activeTranscriptIndex(input);
  return [
    words.follow,
    follow ? words.following : words.notFollowing,
    ...lines.map(({ at, speaker, text }, i) => words.line(clockLine(at, lang), speaker, text, i === active)),
  ];
}

import {
  clipKey,
  media,
  numberLine,
  pluralForm,
  sessionKey,
  type Meta,
  type SessionState,
} from "../../../catalog";
import { learningWordsFor } from "../lang";

export const learningAudio = media.meta({ kind: "media", max: 64, read: false });
export const audioParts = ["audio", "audio_2", "audio_3", "audio_4", "audio_5", "audio_6"] as const;
export const roundAudioPart = (index: number) => audioParts[index]!;
export const promptPlayback = Object.fromEntries(audioParts.map((part) => [part, {}]));
export const promptPlaybackActions = Object.fromEntries(
  audioParts.map((part) => [part, ["play", "pause"] as const]),
);

export function roundAudioProps(field: "audio" | "media") {
  return (item: Readonly<Record<string, unknown>>, index: number, revealed: boolean) =>
    Object.fromEntries(
      audioParts.map((part, at) => [part, !revealed && at === index ? item[field] : undefined]),
    );
}

export function cardsLeft(count: number, lang?: string): string {
  return learningWordsFor(lang).flashcard.left(numberLine(count, lang), pluralForm(count, lang));
}

export const readFlashcard: NonNullable<Meta["read"]> = (input, state, lang, _data, _currency, control) => {
  const { flashcard, promptAudio } = learningWordsFor(lang);
  const { style, [sessionKey]: current } = input as { style?: string; [sessionKey]?: SessionState };
  if (state === "success") return [flashcard.complete];
  if (state === "empty") return [flashcard.empty];
  if (current?.kind !== "rounds" || !current.recall) return [];
  return [
    cardsLeft(current.recall.remaining, lang),
    ...(style === "binary" && current.revealed ? [flashcard.stillLearning, flashcard.know] : []),
    ...(control?.(clipKey(roundAudioPart(current.index))) === "error" && !current.revealed
      ? [promptAudio.unavailable]
      : []),
  ];
};

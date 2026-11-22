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
export const promptPlayback = { audio: {} } as const;

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
    ...(control?.(clipKey("audio")) === "error" && !current.revealed ? [promptAudio.unavailable] : []),
  ];
};

import { numberLine, pluralForm, type StateName } from "../../../catalog";
import { socialWordsFor } from "../lang";

type Speaker = { name: string; role: "host" | "cohost" | "speaker"; speaking?: boolean; muted?: boolean };

export function liveRoomListenerLine(count: number, lang?: string): string {
  return socialWordsFor(lang).liveRoom.listeners(numberLine(count, lang), pluralForm(count, lang));
}

export function liveRoomSpeakerStatus(speaker: Speaker, lang?: string): string | undefined {
  const words = socialWordsFor(lang).liveRoom;
  return speaker.muted ? words.muted : speaker.speaking ? words.speaking : undefined;
}

export function liveRoomActiveSpeaker<T extends Speaker>(speakers: readonly T[]): T | undefined {
  return speakers.find(({ speaking, muted }) => speaking && !muted);
}

export function liveRoomReading(input: unknown, state: StateName, lang?: string): string[] {
  const words = socialWordsFor(lang).liveRoom;
  if (state === "loading") return [words.loading];
  if (state === "error") return [words.error];
  if (state === "success") return [words.success];
  const { speakers, listenersCount, style } = input as {
    speakers: readonly Speaker[];
    listenersCount: number;
    style: "stage" | "mini";
  };
  if (style === "mini") {
    const speaker = liveRoomActiveSpeaker(speakers);
    return speaker ? [speaker.name, words.speaking] : [];
  }
  return [liveRoomListenerLine(listenersCount, lang)];
}

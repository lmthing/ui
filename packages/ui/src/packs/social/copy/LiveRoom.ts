import { numberLine, pluralForm, type StateName } from "../../../catalog";
import { socialWordsFor } from "../lang";

type Speaker = {
  name: string;
  role: "host" | "cohost" | "speaker";
  photo?: string | undefined;
  speaking?: boolean;
  muted?: boolean;
};
type LiveRoomRead = {
  speakers: readonly Speaker[];
  listenersCount: number;
  style: "stage" | "mini";
  detail: "full" | "brief";
  roomKey?: string;
  joined?: boolean;
  handRaised?: boolean;
  isHost?: boolean;
  canSpeak?: boolean;
  micOn?: boolean;
  canModerate?: boolean;
  reactionsOpen?: boolean;
};

export function liveRoomListenerLine(count: number, lang?: string): string {
  return socialWordsFor(lang).liveRoom.listeners(numberLine(count, lang), pluralForm(count, lang));
}

export function liveRoomListenerUnit(count: number, lang?: string): string {
  return socialWordsFor(lang).liveRoom.listenerUnit(pluralForm(count, lang));
}

export function liveRoomSpeakerStatus(speaker: Speaker, lang?: string): string | undefined {
  const words = socialWordsFor(lang).liveRoom;
  return speaker.muted ? words.muted : speaker.speaking ? words.speaking : undefined;
}

export function liveRoomSpeakerInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join("");
}

export function liveRoomActiveSpeaker<T extends Speaker>(speakers: readonly T[]): T | undefined {
  return speakers.find(({ speaking, muted }) => speaking && !muted);
}

export function liveRoomReading(input: unknown, state: StateName, lang?: string): string[] {
  const words = socialWordsFor(lang).liveRoom;
  if (state === "loading") return [words.loading];
  if (state === "error") return [words.error];
  if (state === "success") return [words.success];
  const room = input as LiveRoomRead;
  const { speakers, listenersCount, style, detail } = room;
  if (style === "mini") {
    const speaker = liveRoomActiveSpeaker(speakers);
    return [...(speaker ? [speaker.name, words.speaking] : []), words.leave];
  }
  const joined = room.roomKey ? room.joined : room.isHost;
  const moderator = room.roomKey ? room.canModerate : room.isHost;
  return [
    liveRoomListenerLine(listenersCount, lang),
    ...speakers.flatMap((speaker) => {
      const status = liveRoomSpeakerStatus(speaker, lang);
      return [
        ...(!speaker.photo ? [liveRoomSpeakerInitials(speaker.name)] : []),
        ...(detail === "full" ? [words.role[speaker.role]] : []),
        ...(status ? [words.speakerStatus(speaker.name, status)] : []),
      ];
    }),
    ...(joined ? [room.handRaised ? words.lower : words.hand, words.leave] : [words.connect]),
    ...(room.canSpeak ? [room.micOn ? words.mute : words.speak] : []),
    ...(room.reactionsOpen ? [words.applaud, words.heart] : []),
    ...(moderator ? [words.end] : []),
  ];
}

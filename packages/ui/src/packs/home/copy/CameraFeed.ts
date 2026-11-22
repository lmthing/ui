import type { StateName } from "../../../catalog";
import { homeWordsFor, type HomeWords } from "../lang";
import { homeTimestampParts } from "./timestamp";

type Words = HomeWords["cameraFeed"];
type Event = { id: string; kind: keyof Words["kinds"]; at: string; clip?: string | undefined };
type Camera = {
  mode: keyof Words["modes"];
  style: "live" | "events";
  live: boolean;
  audioOn: boolean;
  preview?: string | undefined;
  events: Event[];
};

export function cameraControls({ live, mode, style }: Camera) {
  return style === "live" && live && mode !== "privacy";
}

export function cameraFrame({ mode, preview }: Camera) {
  return mode === "privacy" ? undefined : preview;
}

export function cameraStatus(input: Camera, lang?: string) {
  const { cameraFeed: words } = homeWordsFor(lang);
  return input.mode === "privacy" ? words.private : input.live ? words.live : words.snapshot;
}

export function cameraEventRows<T extends Event>(events: readonly T[], lang?: string) {
  const { cameraFeed: words } = homeWordsFor(lang);
  return [...events]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .map((event) => ({
      ...event,
      label: words.kinds[event.kind],
      ...homeTimestampParts(event.at, lang),
    }));
}

export function cameraReading(raw: unknown, state: StateName, lang?: string): string[] {
  const input = raw as Camera;
  const { cameraFeed: words } = homeWordsFor(lang);
  const status = [words.modes[input.mode], cameraStatus(input, lang)];
  if (state === "success") status.push(words.success);
  if (input.style === "live" && input.mode !== "privacy" && !cameraFrame(input)) status.push(words.noFrame);
  if (input.style === "live") status.push(words.mode);
  if (cameraControls(input))
    status.push(input.audioOn ? words.audioOn : words.audioOff, words.talk, words.siren);
  const rows = cameraEventRows(input.events, lang);
  return [
    ...status,
    ...(rows.length
      ? [words.events, ...rows.map(({ id, label, date, clock }) => words.eventLine(id, label, date, clock))]
      : [words.events, words.empty]),
  ];
}

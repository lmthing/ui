import { numberLine } from "../../../catalog";
import { mindWordsFor } from "../lang";

export function mixTimer(minutes: number, lang?: string): string {
  const words = mindWordsFor(lang).soundscape;
  return minutes === 0 ? words.off : words.minutes(numberLine(minutes, lang));
}

export function mixRead(
  sounds: readonly { label: string; level: number }[],
  timer: number,
  running: boolean,
  lang?: string,
): string[] {
  const { sleep, play, pause, volumeReading } = mindWordsFor(lang).soundscape;
  return [
    sleep,
    mixTimer(timer, lang),
    running ? pause : play,
    ...sounds.map(({ label, level }) => volumeReading(JSON.stringify(label), numberLine(level, lang))),
  ];
}

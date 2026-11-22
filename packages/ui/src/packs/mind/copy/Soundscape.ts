import { z } from "zod";
import { defineLocalState, icon, numberLine, text } from "../../../catalog";
import { mindWordsFor } from "../lang";

export function mixTimer(minutes: number, lang?: string): string {
  const words = mindWordsFor(lang).soundscape;
  return minutes === 0 ? words.off : words.minutes(numberLine(minutes, lang));
}

export function mixTimerParts(minutes: number, lang?: string) {
  const words = mindWordsFor(lang).soundscape;
  return minutes === 0
    ? { suffix: words.off }
    : { count: numberLine(minutes, lang), suffix: words.minutes("") };
}

export const volumeMax = 10;
export const levelValue = z.int().min(0).max(volumeMax);
export const presetList = z
  .array(
    z.strictObject({
      label: text(14),
      levels: z.array(levelValue).min(2).max(6),
    }),
  )
  .min(1)
  .max(4);

const sound = z.strictObject({ id: z.string().max(4), label: text(14), icon, level: levelValue });
const soundList = z.array(sound).min(2).max(6);
type Sound = z.output<typeof sound>;
type Preset = z.output<typeof presetList>[number];

export const soundscapeMix = defineLocalState({
  schema: z.strictObject({
    sounds: soundList,
    presets: presetList.optional(),
    selected: text(14).optional(),
  }),
  initial: ({ sounds, presets }) => ({
    sounds: sounds as Sound[],
    presets: presets as Preset[] | undefined,
  }),
  events: ["presets.select"],
  itemEvents: ["mix_level.set"],
  reduce: (state, event) => {
    if (event.part === "presets") {
      const preset = state.presets?.find(({ label }) => label === event.value);
      if (!preset) return { error: "Unknown mix preset" };
      const sounds = state.sounds.map((row, index) => ({ ...row, level: preset.levels[index]! }));
      return { state: { ...state, sounds, selected: preset.label } };
    }
    const level = levelValue.safeParse(event.value);
    const current = state.sounds.find(({ id }) => id === event.item);
    if (!current || !level.success) return { error: "Unknown sound or invalid level" };
    if (current.level === level.data) return { state };
    const sounds = state.sounds.map((row) => (row === current ? { ...row, level: level.data } : row));
    return { state: { ...state, sounds, selected: undefined } };
  },
  project: ({ sounds, presets, selected }) => (presets ? { sounds, selectedPreset: selected } : {}),
});

export function mixPresetOptions(presets: unknown) {
  const options = Array.isArray(presets) ? (presets as Preset[]).map(({ label }) => label) : [];
  return { presetOptions: options, savedMixControls: options.length > 0 };
}

export function mixRead(
  sounds: readonly { label: string; level: number }[],
  timer: number,
  running: boolean,
  lang?: string,
  presets?: readonly Preset[],
  selected?: string,
): string[] {
  const words = mindWordsFor(lang).soundscape;
  return [
    words.sleep,
    mixTimer(timer, lang),
    running ? words.pause : words.play,
    ...sounds.map(({ label, level }) => words.volumeReading(JSON.stringify(label), numberLine(level, lang))),
    ...(presets ? [words.presets, ...presets.map(({ label }) => JSON.stringify(label))] : []),
    ...(selected ? [words.selectedPreset(JSON.stringify(selected))] : []),
  ];
}

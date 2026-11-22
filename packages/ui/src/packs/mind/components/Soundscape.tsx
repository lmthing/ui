import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
// prettier-ignore
import { levelValue, mixPresetOptions, mixRead, mixTimerParts, presetList, soundscapeMix, volumeMax } from "../copy";
import { mindWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Soundscape.generated";

// Core first: Player/audio plays one recording, not simultaneous loops with separate volume and a sleep timer.
const timerMax = 120;
const secondsPerMinute = 60;
const levelSet = { prop: "level", min: 0, max: volumeMax, integer: true } as const;

// prettier-ignore
export const meta = {
  id: "Soundscape", status: "ready", group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  region: "body", weight: 2, tier: "phone",
  realPath: "Bundled sound loops are mixed and played on the device.",
  variants: { arrange: ["grid", "rows"] },
  writeHints: prompt.writeHints,
  parts: ["root", "mix", "mix_label", "mix_icon", "timer", "timer_label", "presets"],
  items: {
    key: "sounds",
    parts: ["root", "label", "icon", "level", "mix_level"],
    set: { level: levelSet, mix_level: levelSet },
  },
  set: { timer: { prop: "timer", min: 0, max: timerMax, integer: true } },
  states: ["filled"],
  actions: {
    parts: { mix: ["play", "pause"], timer: ["set"], presets: ["select"] },
    items: { level: ["set"], mix_level: ["set"] },
    when: { level: { savedMixControls: false }, mix_level: { savedMixControls: true } },
  },
  selections: { presets: { prop: "selectedPreset", choices: { prop: "presetOptions" }, runtime: true } },
  localState: soundscapeMix,
  live: { derive: ({ presets }) => mixPresetOptions(presets) },
  clocks: [
    {
      id: "sleep",
      kind: "up",
      max: ({ timer }) => (Number(timer) > 0 ? Number(timer) * secondsPerMinute : Infinity),
      prop: "elapsed",
      runningProp: "running",
      liveDuration: true,
      restartOnPlay: true,
      start: { part: "mix", action: "play" },
      stop: { part: "mix", action: "pause" },
      zero: "stop",
    },
  ],
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { sounds, timer, running, presets, selectedPreset } = input as z.output<typeof props> & { running?: boolean; selectedPreset?: string };
    return mixRead(sounds, timer, running === true, lang, presets, selectedPreset);
  },
} as const satisfies c.Meta;

// prettier-ignore
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    sounds: z.array(z.strictObject({ label: c.text(14), icon: c.icon, level: levelValue })).min(2).max(6),
    timer: z.int().min(0).max(timerMax),
    presets: presetList.optional(),
  })
  .refine(
    ({ presets, sounds }) =>
      !presets ||
      (presets.every(({ levels }) => levels.length === sounds.length) &&
        new Set(presets.map(({ label }) => label.toLowerCase())).size === presets.length),
    { path: ["presets"], message: "Give each mix a distinct label and one level per sound" },
  );

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  return {
    sounds: Array.from({ length: Math.max(2, items.length) }, (_, index) => {
      const item = items[index];
      return {
        label: (item && c.titleOf(item, 14, thing)) ?? c.placeholderTitle(index, lang),
        icon: "music",
        level: 0,
      };
    }),
    timer: 0,
  };
}

// prettier-ignore
export const examples = [
  {
    sounds: [
      { label: "Rain", icon: "cloud_rain", level: 6 },
      { label: "Wind", icon: "wind", level: 2 },
      { label: "Fire", icon: "flame", level: 0 },
    ],
    timer: 20,
  },
  {
    sounds: [
      { label: "Waves", icon: "drop", level: 7 },
      { label: "Night air", icon: "moon", level: 3 },
    ],
    timer: 45,
    presets: [{ label: "Deep rest", levels: [4, 6] }, { label: "Soft waves", levels: [5, 0] }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Soundscape");
// prettier-ignore
export const probes = [
  choose("Let me play rain and fire together, move their volume sliders separately and switch the sounds off after 20 minutes."),
  choose("Play one narrated meditation recording with a progress bar and play or pause. No mixing and no other audio tracks.", "Player"),
  write("Mix rain at 6 of 10, wind at 2 and fire muted, with an icon per loop and a 20-minute sleep timer."),
  {
    ...write("Mix rain at 4 and waves at 7 with an icon and a volume slider for each. Stack them in full-width rows, one sound per row, not side by side. Leave the sleep timer off."),
    variant: { axis: "arrange", value: "rows" },
  },
  read("Which addressed level slider do I set to change Wind volume without touching the rest of the mix?", { address: "s1/r2/level", action: "set" }),
  {
    ...write("Mix Rain then Wind, at levels 6 and 2. Keep the timer off. Include one saved mix named Night rain that sets Rain to 3 and Wind to 0."),
    expectProps: { presets: [{ label: "Night rain", levels: [3, 0] }] },
  },
] satisfies c.Probe[];

type SoundscapeProps = c.Props<typeof props, typeof meta>;
// prettier-ignore
function SoundTile({ sound: { id, label, icon, level }, density, part }: {
  sound: SoundscapeProps["sounds"][number]; density: c.ThemeDensity; part: "level" | "mix_level";
}) {
  const { words, lang } = kit.useWords(mindWordsFor);
  return (
    <kit.KitRow item={id} label={label} inline density={density}>
      <kit.KitGrid fitLast density={density}>
        <kit.KitContent lineRole="body" density={density}
          lead={<kit.KitIcon name={icon} part="icon" scale="sm" tone="muted" />}>
          <kit.KitText part="label" role="body" density={density}>{label}</kit.KitText>
        </kit.KitContent>
        <kit.KitText part={null} role="number" numberScale="compact" tone="muted" tabular density={density}>
          {c.numberLine(level, lang)}
        </kit.KitText>
      </kit.KitGrid>
      <kit.KitSlider label={words.soundscape.volume(label)} part={part} value={level} max={volumeMax} />
    </kit.KitRow>
  );
}

// prettier-ignore
function SoundRows({ sounds, density, arrange, presets }: Pick<SoundscapeProps, "sounds" | "arrange" | "presets"> & { density: c.ThemeDensity }) {
  const part = presets ? "mix_level" : "level";
  const tiles = sounds.map((sound) => <SoundTile key={sound.id} {...{ sound, density, part }} />);
  const rows = arrange === "rows" ? tiles : tiles.flatMap((tile, index) => {
    if (index % 2 !== 0) return [];
    const second = tiles[index + 1];
    return second ? <kit.KitGrid key={sounds[index]!.id} density={density}>{tile}{second}</kit.KitGrid> : tile;
  });
  return <kit.KitRowGroup density={density} separators={false} spacing="groups">{rows}</kit.KitRowGroup>;
}

// prettier-ignore
export function Soundscape(input: SoundscapeProps) {
  const { words: { soundscape: { play, pause, sleep, presets: presetLabel } }, lang } = kit.useWords(mindWordsFor);
  const density = kit.useKit().density;
  const surface = "card";
  const arrange = kit.useVariant("arrange", meta.variants.arrange, input.arrange);
  const live = kit.useLiveControls(meta, input);
  const { running, sounds, timer } = live as SoundscapeProps & { running?: boolean };
  const action = running ? "pause" : "play", time = mixTimerParts(timer, lang);
  return <kit.KitCard part="root" padded {...{ density, surface }}>
      {input.presets && <kit.KitContent density={density}>
        <kit.KitHeader title={{ text: presetLabel, role: "body", strong: true }} density={density} />
        <kit.KitTrack part="presets" role="radiogroup" label={presetLabel}>
          {input.presets.map(({ label }) => <kit.KitChip key={label} item={null} label={label}
            role="radio" on={live.selectedPreset === label} />)}
        </kit.KitTrack>
      </kit.KitContent>}
      <kit.KitContent group={input.presets ? "response" : "content"} density={density}>
        <SoundRows presets={input.presets} {...{ density, arrange, sounds }} />
      </kit.KitContent>
      <kit.KitContent group="response" density={density}>
        <kit.KitGrid fitLast density={density}>
          <kit.KitText part="timer_label" role="label" density={density}>{sleep}</kit.KitText>
          <kit.KitText part={null} role="label" tone="muted" density={density}>
            {time.count && <kit.KitText part={null} role="number" numberScale="compact" tabular>{time.count}</kit.KitText>}
            {time.suffix}
          </kit.KitText>
        </kit.KitGrid>
        <kit.KitSlider label={sleep} part="timer" max={timerMax} value={timer} />
      </kit.KitContent>
      <kit.KitActionFooter density={density}><kit.KitAction label={running ? pause : play}
        part="mix" icon={action} action={action} full /></kit.KitActionFooter>
    </kit.KitCard>;
}

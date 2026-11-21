import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { mixRead, mixTimer } from "../copy";
import { mindWordsFor } from "../lang";

// Core first: Player/audio plays one recording, not simultaneous loops with separate volume and a sleep timer.
const volumeMax = 10;
const timerMax = 120;
const secondsPerMinute = 60;

export const meta = {
  id: "Soundscape",
  status: "ready",
  group: "input",
  purpose: "Mix calming sound loops at individual volumes and set a sleep timer.",
  pick: "Combine two to six looping background sounds such as rain and fire with independent volumes and a sleep timer. Not one recording (Player) or a list of tracks to play in turn (Playlist).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Bundled sound loops are mixed and played on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], arrange: ["grid", "rows"] },
  writeHints: [
    'Leave unrequested density and surface null, even when arrange is requested: {"density":null,"surface":null,"arrange":"rows"}. Use compact or outlined only when explicitly asked for that finish.',
    "Supply each loop with its own icon and a whole-number volume from 0 to 10; use 0 for muted. The sleep timer is whole minutes (0 means off).",
    'Use arrange "rows" for a full-width stack with one sound per row, or null for the default two-column grid.',
  ],
  parts: ["root", "mix", "mix_label", "mix_icon", "timer", "timer_label"],
  items: {
    key: "sounds",
    parts: ["root", "label", "icon", "level"],
    set: { level: { prop: "level", min: 0, max: volumeMax, integer: true } },
  },
  set: { timer: { prop: "timer", min: 0, max: timerMax, integer: true } },
  states: ["filled"],
  actions: { parts: { mix: ["play", "pause"], timer: ["set"] }, items: { level: ["set"] } },
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
    const { sounds, timer, running } = input as z.output<typeof props> & { running?: boolean };
    return mixRead(sounds, timer, running === true, lang);
  },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  sounds: z
    .array(z.strictObject({ label: c.text(14), icon: c.icon, level: z.int().min(0).max(volumeMax) }))
    .min(2)
    .max(6),
  timer: z.int().min(0).max(timerMax),
});

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
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Soundscape");
export const probes = [
  choose(
    "Let me play rain and fire together, move their volume sliders separately and switch the sounds off after 20 minutes.",
  ),
  choose(
    "Play one narrated meditation recording with a progress bar and play or pause. No mixing and no other audio tracks.",
    "Player",
  ),
  write("Mix rain at 6 of 10, wind at 2 and fire muted, with an icon per loop and a 20-minute sleep timer."),
  {
    ...write(
      "Mix rain at 4 and waves at 7 with an icon and a volume slider for each. Stack them in full-width rows, one sound per row, not side by side. Leave the sleep timer off.",
    ),
    variant: { axis: "arrange", value: "rows" },
  },
  read("Set the Wind volume separately.", { address: "s1/r2/level", action: "set" }),
] satisfies c.Probe[];

type SoundscapeProps = c.Props<typeof props, typeof meta>;

function SoundTile({
  sound: { id, label, icon, level },
  density,
}: {
  sound: SoundscapeProps["sounds"][number];
  density: c.ThemeDensity;
}) {
  const { words, lang } = kit.useWords(mindWordsFor);
  return (
    <kit.KitRow item={id} label={label} inline density={density}>
      <kit.KitGrid fitLast density={density}>
        <kit.KitContent
          lineRole="body"
          lead={<kit.KitIcon name={icon} part="icon" scale="sm" tone="muted" />}
          density={density}
        >
          <kit.KitText part="label" role="body" density={density}>
            {label}
          </kit.KitText>
        </kit.KitContent>
        <kit.KitText part={null} role="number" numberScale="compact" tone="muted" tabular density={density}>
          {c.numberLine(level, lang)}
        </kit.KitText>
      </kit.KitGrid>
      <kit.KitSlider label={words.soundscape.volume(label)} part="level" value={level} max={volumeMax} />
    </kit.KitRow>
  );
}

export function Soundscape(input: SoundscapeProps) {
  const { words, lang } = kit.useWords(mindWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const arrange = kit.useVariant("arrange", meta.variants.arrange, input.arrange);
  const running = kit.useLiveControls(meta, input).running === true;
  const { sounds, timer } = input;
  const { play, pause, sleep } = words.soundscape;
  const action = running ? "pause" : "play";
  const tiles = sounds.map((sound) => <SoundTile key={sound.id} {...{ sound, density }} />);
  const rows =
    arrange === "rows"
      ? tiles
      : tiles.flatMap((tile, index) => {
          if (index % 2 !== 0) return [];
          const second = tiles[index + 1];
          return second ? (
            <kit.KitGrid key={sounds[index]!.id} density={density}>
              {tile}
              {second}
            </kit.KitGrid>
          ) : (
            tile
          );
        });
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      <kit.KitGrid density={density} arrange="rows" list listRowGap="cards">
        {rows}
      </kit.KitGrid>
      <kit.KitContent group="response" density={density}>
        <kit.KitGrid fitLast density={density}>
          <kit.KitText part="timer_label" role="label" density={density}>
            {sleep}
          </kit.KitText>
          <kit.KitText part={null} role="label" tone="muted" density={density}>
            {mixTimer(timer, lang)}
          </kit.KitText>
        </kit.KitGrid>
        <kit.KitSlider label={sleep} part="timer" max={timerMax} value={timer} />
      </kit.KitContent>
      <kit.KitAction label={running ? pause : play} part="mix" icon={action} action={action} full />
    </kit.KitCard>
  );
}

import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Player/audio plays one recording, not simultaneous loops with separate volume and a sleep timer.
export const meta = {
  id: "Soundscape",
  status: "draft",
  group: "input",
  purpose: "Mix calming sound loops at individual volumes and set a sleep timer.",
  pick: "Combine two to six looping background sounds such as rain and fire with independent volumes and a sleep timer. Not one recording (Player) or a list of tracks to play in turn (Playlist).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Bundled sound loops are mixed and played on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root", "mix", "timer"],
  items: {
    key: "sounds",
    parts: ["root", "label", "icon", "level"],
    set: { level: { prop: "level", min: 0, max: 10, integer: true } },
  },
  set: { timer: { prop: "timer", min: 0, max: 120, integer: true } },
  states: ["filled"],
  actions: { parts: { mix: ["play", "pause"], timer: ["set"] }, items: { level: ["set"] } },
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { sounds, timer } = input as z.output<typeof props>;
    return [
      c.durationLine(timer, lang),
      ...sounds.map(({ label, level }) => `${JSON.stringify(label)}: ${c.numberLine(level, lang)}`),
    ];
  },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  sounds: z
    .array(z.strictObject({ label: c.text(14), icon: c.icon, level: z.int().min(0).max(10) }))
    .min(2)
    .max(6),
  timer: z.int().min(0).max(120),
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
    density: "compact",
    surface: "outlined",
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
  read("Set the Wind volume separately.", { address: "s1/r2/level", action: "set" }),
] satisfies c.Probe[];

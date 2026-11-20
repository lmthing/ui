import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Player/density compact cannot follow playback across screens above the tab bar.
export const meta = {
  id: "MiniPlayer",
  status: "draft",
  group: "action",
  purpose: "Keep the current recording within reach while moving between screens.",
  pick: "Host-built persistent playback bar above the tabs, hidden on the full player screen. Never choose or write it; use Player for a recording on one screen.",
  region: "bottom",
  weight: 1,
  tier: "phone",
  realPath: "The bar follows the device's current playback.",
  codeOwned: true,
  variants: { surface: ["card", "plain"] },
  parts: ["root", "photo", "title", "progress", "play"],
  states: ["filled"],
  actions: {
    parts: { root: ["press"], play: ["play", "pause"] },
    when: { "play.play": { playing: false }, "play.pause": { playing: true } },
  },
  read: (value, _state, lang): string[] => {
    const { at, seconds } = value as z.output<typeof props>;
    return [c.clockLine(at, lang), c.remainingLine(seconds - at, lang)];
  },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    title: c.text(40),
    photo: c.photo,
    at: z.int().min(0).max(36000),
    seconds: z.int().min(1).max(36000),
    playing: z.boolean(),
    goto: c.screenId,
  })
  .refine(({ at, seconds }) => at <= seconds, { path: ["at"] });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const [item] = c.itemsOf(cast, 1);
  return {
    title: (item && c.titleOf(item, 40, thing)) || c.placeholderTitle(0, lang),
    photo: c.photo.safeParse(thing && `lib:${thing.type}`).data ?? "lib:item",
    at: 0,
    seconds: 60,
    playing: false,
    goto: "player",
  };
}

export const examples = [
  {
    title: "Morning on the Fern Shelf",
    photo: "lib:plants",
    at: 45,
    seconds: 480,
    playing: true,
    goto: "fern_shelf",
  },
  {
    title: "The Slow Walk",
    photo: "lib:dogs",
    at: 12,
    seconds: 275,
    playing: false,
    goto: "slow_walk",
    surface: "plain",
  },
] satisfies z.input<typeof props>[];

// Host-only, like TabBar: the read gate still checks playback and navigation.
const { read } = c.probesFor("MiniPlayer");
export const probes = [
  read(
    "Pause the recording using the playback control. Use the offered playback action, not a press that opens the full player.",
    {
      address: "m1/play",
      action: "pause",
    },
  ),
  read("Open the full player without changing playback", { address: "m1", action: "press" }, 1),
] satisfies c.Probe[];

import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { miniPlayerTiming } from "../copy";
import { mediaWordsFor } from "../lang";

// Core first: Player/density compact cannot follow playback across screens above the tab bar.
export const meta = {
  id: "MiniPlayer",
  status: "ready",
  group: "action",
  purpose: "Keep the current recording within reach while moving between screens.",
  pick: "Host-built persistent playback bar above the tabs, hidden on the full player screen. Never choose or write it; use Player for a recording on one screen.",
  region: "bottom",
  weight: 1,
  tier: "phone",
  realPath: "The bar follows the device's current playback.",
  codeOwned: true,
  parts: ["root", "photo", "title", "progress", "time", "play", "play_icon"],
  states: ["filled"],
  actions: {
    parts: { root: ["press"], play: ["play", "pause"] },
    when: { "play.play": { playing: false }, "play.pause": { playing: true } },
  },
  read: (value, _state, lang): string[] => {
    const input = value as z.output<typeof props>;
    const words = mediaWordsFor(lang).miniPlayer;
    return [input.playing ? words.playing : words.paused, miniPlayerTiming(input, lang)];
  },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
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
    title: "The Fern Shelf",
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
  },
] satisfies z.input<typeof props>[];

// Host-only, like TabBar. The pack's choose near miss expects Player.
const { read } = c.probesFor("MiniPlayer");
export const probes = [
  read(
    "Pause this audio and stay on this screen. Use the playback control, not the navigation link. Give its address with no spaces and use one playback verb (play or pause), not press.",
    { address: "m1/play", action: "pause" },
  ),
  read("Open the full player without changing playback", { address: "m1", action: "press" }, 1),
  read("Resume the recording without opening the full player", { address: "m1/play", action: "play" }, 1),
] satisfies c.Probe[];

export function MiniPlayer(input: c.Props<typeof props, typeof meta>) {
  const { title, photo, at, seconds, playing, goto } = input;
  const density = kit.useKit().density;
  const surface = "card";
  const { lang, words } = kit.useWords(mediaWordsFor);
  const action = playing ? "pause" : "play";
  const copy = words.miniPlayer;
  return (
    <kit.KitRow label={title} {...{ density, surface }}>
      <kit.KitGrid fitLast density={density}>
        <kit.KitRow part="root" inline label={copy.open(title)} goto={goto} density={density}>
          <kit.KitContent
            lineRole="body"
            density={density}
            leadingAlign="row"
            lead={<kit.KitPhoto part="photo" photo={photo} label={copy.artwork} />}
          >
            <kit.KitText part="title" role="body" lines={1} density={density}>
              {title}
            </kit.KitText>
            <kit.KitStepsTrack style="bar" count={1} at={at / seconds} part="progress" />
            <kit.KitText part="time" role="caption" tone="muted" tabular>
              {miniPlayerTiming(input, lang)}
            </kit.KitText>
          </kit.KitContent>
        </kit.KitRow>
        <kit.KitAction part="play" kind="secondary" action={action} icon={action} a11y={copy[action]} />
      </kit.KitGrid>
    </kit.KitRow>
  );
}

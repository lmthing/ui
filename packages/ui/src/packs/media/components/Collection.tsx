import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Hero/media cover cannot combine collection credits, computed totals, play-all and follow.
export const meta = {
  id: "Collection",
  status: "draft",
  group: "content",
  purpose: "See one show's details, start the whole series and follow new releases.",
  pick: "The overview at the top of one show, album, book or course, with artwork, credits, play-all and follow. Not a photo and headline (Hero), a person (Profile), one recording (Player), or owned things (Things).",
  writeHints: ["Count and duration come from Playlist on this screen; never write either value."],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The collection details are stored with the app's media.",
  variants: { density: ["comfortable", "compact"], aspect: ["square", "wide"] },
  parts: ["root", "photo", "title", "by", "about", "summary", "play", "follow"],
  states: ["filled", "loading"],
  actions: { parts: { play: ["press"], follow: ["toggle"] } },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  title: c.text(40),
  by: c.text(32),
  photo: c.photo,
  about: c.text(200).optional(),
  followed: z.boolean(),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const [item] = c.itemsOf(cast, 1);
  return {
    title: (item && c.titleOf(item, 40, thing)) || c.placeholderTitle(0, lang),
    by: (item && c.detailOf(item, 32, thing)) || c.wordsFor(lang).placeholderLabel,
    photo: c.photo.safeParse(thing && `lib:${thing.type}`).data ?? "lib:item",
    followed: false,
  };
}

export const examples = [
  {
    title: "Life on the Fern Shelf",
    by: "Noor Martin",
    photo: "lib:plants",
    about: "A short series on making room for ferns in a small flat.",
    followed: false,
  },
  {
    title: "The Slow Walk",
    by: "Ella Price",
    photo: "lib:dogs",
    about: "Field notes on giving dogs time to explore at their own pace.",
    followed: true,
    aspect: "wide",
    density: "compact",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Collection");
export const probes = [
  choose(
    "Give this podcast series one overview with its cover, presenter, total episode count, play-all and a follow button",
  ),
  choose(
    "Lead the homepage with one large photograph and the headline A greener home, without any playback or follow buttons",
    "Hero",
  ),
  write(
    "At the top of the show page, feature Life on the Fern Shelf by Noor Martin, artwork lib:plants. Describe it as A short series on ferns in a small flat. I haven't followed it yet. Give me play-all and follow.",
  ),
  read("Follow this series without starting playback", { address: "c1/follow", action: "toggle" }),
] satisfies c.Probe[];

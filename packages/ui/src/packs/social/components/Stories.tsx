import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { storiesReading } from "../copy";
import { socialWordsFor } from "../lang";

// Core first: People/roster cannot distinguish seen updates from unseen ones or add a story.
export const meta = {
  id: "Stories",
  status: "ready",
  group: "content",
  purpose: "Tap through people’s short-lived updates and add one of your own.",
  pick: "Short-lived stories from people, opened from seen or unseen avatar rings, with an optional add button first. Not a member roster (People) or a photo collection (Gallery).",
  writeHints: [
    'For an add button set "mine":true. Never insert an add entry or a "Me" story in people: the button renders separately. List only the existing stories from the brief, in order, with their goto links and seen flags.',
    'For explicitly hiding captions write "detail":"brief" and preserve the names. Otherwise write "detail":null. If no density or surface is requested, write "density":null and "surface":null.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  partTiers: { add: "ok" },
  realPath: "Stories in a shared app disappear after a day; adding one opens the camera.",
  variants: { density: ["comfortable", "compact"], surface: ["plain", "card"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["name", "add_label"] } },
  parts: ["root", "rail", "scroll", "add", "add_icon", "add_label", "empty"],
  items: { key: "people", parts: ["root", "photo", "name"] },
  states: ["filled", "empty"],
  actions: { parts: { add: ["press"] }, items: { root: ["press"] }, when: { add: { mine: true } } },
  emptyActions: ["add.press"],
  read: storiesReading,
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  people: z
    .array(
      z.strictObject({
        name: c.text(12),
        photo: c.photo,
        seen: z.boolean(),
        goto: c.screenId,
      }),
    )
    .min(1)
    .max(10),
  mine: z.boolean(),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const people = c.itemsOf(cast, 3).map((item, index) => ({
    name: c.titleOf(item, 12, thing) || c.clip(c.placeholderTitle(index, lang), 12),
    photo: "lib:people",
    seen: false,
    goto: c.screenId.safeParse(item.id).data ?? "story",
  }));
  return {
    people: people.length
      ? people
      : [{ name: c.clip(c.placeholderTitle(0, lang), 12), photo: "lib:people", seen: false, goto: "story" }],
    mine: false,
  };
}

// prettier-ignore
export const examples = [
  { mine: true, people: [
    { name: "Maya", photo: "lib:people_maya", seen: false, goto: "fern_story" },
    { name: "Sam", photo: "lib:people_sam", seen: true, goto: "basil_story" },
  ] },
  { mine: false, people: [
    { name: "Anna", photo: "lib:people_anna", seen: true, goto: "park_story" },
    { name: "Ben", photo: "lib:people_ben", seen: false, goto: "river_story" },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Stories");
export const probes = [
  choose(
    "Show a row of people’s temporary updates that disappear after a day, with rings for new ones and my add button first.",
  ),
  choose(
    "Show an ordinary member roster with names, profile pictures and club roles. No temporary updates.",
    "People",
  ),
  write(
    "Make a row of today’s plant stories: Maya’s fern update is unseen, Sam’s basil update is seen, and I can add my own from the first spot.",
  ),
  {
    ...write(
      "Show Maya’s new fern story and Sam’s already seen basil story, with my add button first. Show only the circles: hide the captions under them, but remember their names.",
    ),
    variant: { axis: "detail", value: "brief", itemTitles: ["Maya", "Sam"] },
  },
  read("Open the camera to add my own story.", { address: "s1/add", action: "press" }),
] satisfies c.Probe[];

type StoriesProps = c.Props<typeof props, typeof meta>;
type StoryFinish = { density: c.ThemeDensity; detail: StoriesProps["detail"] };
const shortRailLimit = 3;

// prettier-ignore
function AddStory({ density, detail }: StoryFinish) {
  const { words: { stories } } = kit.useWords(socialWordsFor);
  return <kit.KitRow part={null} label={stories.add} inset={density === "compact" ? "none" : "md"} density={density}>
    <kit.KitContent align="center" density={density}>
      <kit.KitContent density={density}>
        <kit.KitAction part="add" icon="plus" kind="secondary" a11y={stories.add} action="press" />
      </kit.KitContent>
      {detail === "full" && <kit.KitText part="add_label" role="caption" align="center" lines={1} density={density}>{stories.own}</kit.KitText>}
    </kit.KitContent>
  </kit.KitRow>;
}

// prettier-ignore
function StoryCell({ person, density, detail }: StoryFinish & { person: StoriesProps["people"][number] }) {
  const { words: { stories } } = kit.useWords(socialWordsFor);
  const { id, name, photo, seen, goto } = person;
  return <kit.KitRow part="root" item={id} label={name} goto={goto} inset={density === "compact" ? "none" : "md"} density={density}>
    <kit.KitContent align="center" density={density}>
      <kit.KitPhoto part="photo" shape="round" photo={photo} label={stories.status(name, seen)} ring={seen ? "none" : "accent"} />
      {detail === "full" && <kit.KitText part="name" role="caption" align="center" lines={1} density={density}>{name}</kit.KitText>}
    </kit.KitContent>
  </kit.KitRow>;
}

// prettier-ignore
function StoryRail({ people, mine, density, detail }: StoryFinish & Pick<StoriesProps, "people" | "mine">) {
  const { words: { stories } } = kit.useWords(socialWordsFor);
  const rail = <kit.KitTrack part="rail" label={stories.rail}>
    {mine && <AddStory {...{ density, detail }} />}
    {people.map((person) => <StoryCell key={person.id} {...{ person, density, detail }} />)}
  </kit.KitTrack>;
  return people.length + Number(mine) <= shortRailLimit ? rail :
    <kit.KitScroll part="scroll" axis="horizontal" bounded={false} label={stories.rail}>{rail}</kit.KitScroll>;
}

// prettier-ignore
export function Stories(input: StoriesProps) {
  const state = kit.useComponentState();
  const { lang, words: { stories } } = kit.useWords(socialWordsFor);
  const thing = kit.useEmptyThing();
  const empty = thing ? c.emptyLine(thing, lang) : stories.empty;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  return <kit.KitCard part="root" style="plain" padded {...{ density, surface }}>
    {state !== "empty" ? <StoryRail {...{ ...input, density, detail }} /> : input.mine ? <>
      <kit.KitText part="empty" tone="muted" align="center" density={density}>{empty}</kit.KitText>
      <AddStory {...{ density, detail }} />
    </> : <kit.KitEmpty part="empty" icon="camera" title={empty} decorativeIcon />}
  </kit.KitCard>;
}

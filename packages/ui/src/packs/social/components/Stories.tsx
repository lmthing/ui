import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { storiesReading } from "../copy";
import { socialWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Stories.generated";

// Core first: People/roster cannot distinguish seen updates from unseen ones or add a story.
export const meta = {
  id: "Stories",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "people",
  partTiers: { add: "ok" },
  realPath: "Stories in a shared app disappear after a day; adding one opens the camera.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["name", "add_label"] } },
  parts: ["root", "rail", "scroll", "add", "add_icon", "add_label", "empty"],
  items: { key: "people", parts: ["root", "photo", "name", "note"] },
  states: ["filled", "empty"],
  actions: { parts: { add: ["press"] }, items: { root: ["press"] }, when: { add: { mine: true } } },
  emptyActions: ["add.press"],
  read: storiesReading,
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    style: z.enum(["stories", "notes"]).optional(),
    people: z
      .array(
        z.strictObject({
          name: c.text(12),
          photo: c.photo,
          seen: z.boolean(),
          goto: c.screenId,
          note: c.text(28).optional(),
        }),
      )
      .min(1)
      .max(10),
    mine: z.boolean(),
  })
  .refine(
    ({ style, people }) =>
      style === "notes" ? people.every((row) => row.note) : people.every((row) => !row.note),
    { path: ["people"], message: "Every notes row needs a note; story rows omit notes" },
  );

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

export const examples = [
  {
    mine: true,
    people: [
      { name: "Maya", photo: "lib:people_maya", seen: false, goto: "fern_story" },
      { name: "Sam", photo: "lib:people_sam", seen: true, goto: "basil_story" },
    ],
  },
  {
    mine: false,
    people: [
      { name: "Anna", photo: "lib:people_anna", seen: true, goto: "park_story" },
      { name: "Ben", photo: "lib:people_ben", seen: false, goto: "river_story" },
    ],
  },
  {
    style: "notes",
    mine: false,
    people: [
      {
        name: "Maya",
        photo: "lib:people_maya",
        seen: false,
        goto: "fern_story",
        note: "Cuttings are ready!",
      },
      { name: "Sam", photo: "lib:people_sam", seen: true, goto: "basil_story", note: "Watered the basil" },
    ],
  },
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
  {
    ...write(
      'Show just Maya’s and Sam’s short avatar notes, not stories, with no add button. Maya’s note is "Cuttings are ready!" and Sam’s is "Watered the basil".',
    ),
    expectProps: {
      style: "notes",
      mine: false,
      people: [
        { name: "Maya", note: "Cuttings are ready!" },
        { name: "Sam", note: "Watered the basil" },
      ],
    },
  },
  read("Open the camera to add my own story.", { address: "s1/add", action: "press" }),
] satisfies c.Probe[];

type StoriesProps = c.Props<typeof props, typeof meta>;
type StoryFinish = { density: c.ThemeDensity; detail: StoriesProps["detail"] };
const shortRailLimit = 3;

function AddStory({ density, detail }: StoryFinish) {
  const {
    words: { stories },
  } = kit.useWords(socialWordsFor);
  return (
    <kit.KitRow
      part={null}
      label={stories.add}
      inset={density === "compact" ? "none" : "md"}
      density={density}
    >
      <kit.KitContent align="center" density={density}>
        <kit.KitContent density={density}>
          <kit.KitAction part="add" icon="plus" kind="secondary" a11y={stories.add} action="press" />
        </kit.KitContent>
        {detail === "full" && (
          <kit.KitText part="add_label" role="caption" align="center" lines={1} density={density}>
            {stories.own}
          </kit.KitText>
        )}
      </kit.KitContent>
    </kit.KitRow>
  );
}

function StoryCell({ person, density, detail }: StoryFinish & { person: StoriesProps["people"][number] }) {
  const {
    words: { stories },
  } = kit.useWords(socialWordsFor);
  const { id, name, photo, seen, goto, note } = person;
  const status = note ? stories.noteStatus(name, seen) : stories.status(name, seen);
  return (
    <kit.KitRow
      part="root"
      item={id}
      label={note ? stories.noteLink(status, note) : name}
      goto={goto}
      inset={density === "compact" ? "none" : "md"}
      density={density}
    >
      <kit.KitContent align="center" density={density}>
        {note && (
          <kit.KitCard part="note" look="outlined" padded density={density}>
            <kit.KitText part={null} role="caption" align="center" density={density}>
              {note}
            </kit.KitText>
          </kit.KitCard>
        )}
        <kit.KitPhoto
          part="photo"
          shape="round"
          photo={photo}
          label={status}
          ring={seen ? "none" : "accent"}
        />
        {detail === "full" && (
          <kit.KitText part="name" role="caption" align="center" lines={1} density={density}>
            {name}
          </kit.KitText>
        )}
      </kit.KitContent>
    </kit.KitRow>
  );
}

function StoryRail({ people, mine, density, detail }: StoryFinish & Pick<StoriesProps, "people" | "mine">) {
  const {
    words: { stories },
  } = kit.useWords(socialWordsFor);
  const columns = people.some(({ note }) => note) ? 2 : shortRailLimit;
  const short = people.length + Number(mine) <= columns;
  const cells = [
    ...(mine ? [<AddStory key="add" {...{ density, detail }} />] : []),
    ...people.map((person) => <StoryCell key={person.id} {...{ person, density, detail }} />),
  ];
  const rail = (
    <kit.KitTrack part="rail" label={people[0]?.note ? stories.notes : stories.rail}>
      {short ? (
        <kit.KitGrid columns={columns} density={density}>
          {cells}
        </kit.KitGrid>
      ) : (
        cells
      )}
    </kit.KitTrack>
  );
  return short ? (
    rail
  ) : (
    <kit.KitScroll part="scroll" axis="horizontal" bounded={false} label={stories.rail}>
      {rail}
    </kit.KitScroll>
  );
}

export function Stories(input: StoriesProps) {
  const state = kit.useComponentState();
  const {
    lang,
    words: { stories },
  } = kit.useWords(socialWordsFor);
  const thing = kit.useEmptyThing();
  const empty = thing
    ? c.emptyLine(thing, lang)
    : input.style === "notes"
      ? stories.emptyNotes
      : stories.empty;
  const density = kit.useKit().density;
  const surface = "plain";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  return (
    <kit.KitCard part="root" style="plain" padded {...{ density, surface }}>
      {state !== "empty" ? (
        <StoryRail {...{ ...input, density, detail }} />
      ) : input.mine ? (
        <>
          <kit.KitText part="empty" tone="muted" align="center" density={density}>
            {empty}
          </kit.KitText>
          <AddStory {...{ density, detail }} />
        </>
      ) : input.style === "notes" ? (
        <kit.KitState part="empty" icon="message" message={empty} density={density} />
      ) : (
        <kit.KitEmpty part="empty" icon="camera" title={empty} decorativeIcon />
      )}
    </kit.KitCard>
  );
}

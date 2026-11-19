import { z } from "zod";
import {
  itemsOf,
  photo,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import { KitAction, KitCard, KitContent, KitPhoto, KitRow, KitText, useWords } from "../../../kit";
import { turnReading, visibleTurns } from "../copy";
import { homeWordsFor } from "../lang";

// Core first: People/stack lists people, not a current duty holder and an advancing rotation.
export const meta = {
  id: "Turns",
  status: "ready",
  group: "data",
  purpose: "Rotate one household duty through people and advance or skip the current turn.",
  pick: "One household job rotating through people, with current and next holders. Not a roster of several named household members without turns (People), many chores (Chores), staff shifts (Roster), or game turns (TurnOrder).",
  writeHints: [
    "at is a zero-based index smaller than people.length. The next people and next index are computed.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  partTiers: { next: "people", skip: "people" },
  realPath: "A rotation stays on the device; everyone viewing it on their own phone needs a shared app.",
  items: { key: "visiblePeople", parts: ["root", "name", "photo"] },
  parts: ["root", "job", "next", "skip"],
  states: ["filled"],
  actions: { parts: { next: ["press"], skip: ["press"] } },
  read: (input, state, lang) =>
    state === "filled" ? turnReading((input as z.output<typeof props>).visiblePeople, lang) : [],
} as const satisfies Meta;
const schema = z
  .strictObject({
    job: text(24),
    people: z
      .array(z.strictObject({ name: text(16), photo: photo.optional() }))
      .min(2)
      .max(6),
    at: z.int().min(0).max(5),
  })
  .refine(({ people, at }) => at < people.length, { path: ["at"], message: "at must index people" });
// Only the current and upcoming slots are addressed and read. The full roster stays on the wire.
const withVisiblePeople = (value: z.output<typeof schema>) => ({
  ...value,
  visiblePeople: visibleTurns(value.people, value.at),
});
export const props = schema.overwrite(withVisiblePeople) as typeof schema &
  z.ZodType<ReturnType<typeof withVisiblePeople>, z.input<typeof schema>>;
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast),
    items = itemsOf(cast, 6);
  const people = items.map((item, index) => ({
    name: titleOf(item, 16, thing) ?? placeholderTitle(index, lang),
  }));
  while (people.length < 2) people.push({ name: placeholderTitle(people.length, lang) });
  return { job: placeholderTitle(0, lang), people, at: 0 };
}
export const examples = [
  {
    job: "Mist the plants",
    people: [{ name: "Sam" }, { name: "Alex" }, { name: "Mia" }],
    at: 0,
  },
  {
    job: "Walk Clover",
    people: [{ name: "Alex" }, { name: "Jo" }],
    at: 1,
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Turns");
export const probes = [
  choose("Whose turn it is to wash dishes, followed by the next two people, with Done next and Skip"),
  choose(
    "Show Sam, Alex and Mia together as a stack of portraits with their names, with no rotation",
    "People",
  ),
  write("Mist the plants rotates through Sam, Alex and Mia in that order, Sam is current"),
  read("Finish Sam's turn and give the job to the next person", { address: "t1/next", action: "press" }),
] satisfies Probe[];

type TurnsProps = Props<typeof props, typeof meta>;
type Person = TurnsProps["visiblePeople"][number];

function TurnPortrait({ person, current }: { person: Person; current: boolean }) {
  const image = person.photo ? { photo: person.photo } : { initials: Array.from(person.name)[0] ?? "" };
  return (
    <KitPhoto {...image} shape="round" ring={current ? "accent" : "none"} part="photo" label={person.name} />
  );
}

function TurnRow({
  person,
  current,
  startsQueue,
}: {
  person: Person;
  current: boolean;
  startsQueue: boolean;
}) {
  const { words } = useWords(homeWordsFor);
  const { current: currentLabel, upcoming } = words.turnLabels;
  return (
    <KitRow
      item={person.id}
      label={current ? words.turnHolder(currentLabel, person.name) : person.name}
      inline
    >
      <KitContent>
        {startsQueue && <KitText role="label" tone="muted" part={null} children={upcoming} />}
        {current ? (
          <KitContent lead={<TurnPortrait person={person} current />} leadingAlign="row">
            <KitText role="label" tone="muted" part={null} children={currentLabel} />
            <KitText role="title" part="name" children={person.name} />
          </KitContent>
        ) : (
          <KitRow label={person.name} leading={<TurnPortrait person={person} current={false} />} inset="none">
            <KitText role="body" part="name" children={person.name} />
          </KitRow>
        )}
      </KitContent>
    </KitRow>
  );
}

export function Turns({ job, visiblePeople }: TurnsProps) {
  const { words } = useWords(homeWordsFor);
  const { next, skip } = words.turnLabels;
  return (
    <KitCard part="root" padded>
      <KitText part="job" role="body" children={job} />
      {visiblePeople.map((person, index) => (
        <TurnRow key={person.id} person={person} current={index === 0} startsQueue={index === 1} />
      ))}
      <KitContent
        group="response"
        lead={<KitAction part="next" label={next} kind="secondary" />}
        leadingAlign="row"
      >
        <KitAction part="skip" label={skip} kind="quiet" />
      </KitContent>
    </KitCard>
  );
}

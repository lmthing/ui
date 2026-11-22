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
  variantProps,
} from "../../../catalog";
import {
  KitAction,
  KitCard,
  KitContent,
  KitPhoto,
  KitRow,
  KitText,
  PartScope,
  usePartContext,
  useWords,
} from "../../../kit";
import { turnReading, visibleTurns } from "../copy";
import { homeWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Turns.generated";

// Core first: People/stack lists people, not a current duty holder and an advancing rotation.
export const meta = {
  id: "Turns",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  partTiers: { next: "people", skip: "people" },
  realPath: "A rotation stays on the device; everyone viewing it on their own phone needs a shared app.",
  variants: { lead: ["avatar", "none"], emphasis: ["normal", "hero"] },
  variantParts: { "lead.none": { hides: ["photo"] } },
  items: { key: "visiblePeople", parts: ["root", "name", "photo"] },
  parts: ["root", "job", "next", "skip"],
  states: ["filled"],
  actions: { parts: { next: ["press"], skip: ["press"] } },
  read: (input, state, lang): string[] =>
    state === "filled"
      ? turnReading((input as { visiblePeople: Parameters<typeof turnReading>[0] }).visiblePeople, lang)
      : [],
} as const satisfies Meta;
const schema = z
  .strictObject({
    ...variantProps(meta.variants),
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
  const thing = thingOf(cast);
  const items = itemsOf(cast, 6);
  const people = items.map((item, index) => ({
    name: titleOf(item, 16, thing) ?? placeholderTitle(index, lang),
  }));
  while (people.length < 2) people.push({ name: placeholderTitle(people.length, lang) });
  return { job: placeholderTitle(0, lang), people, at: 0 };
}
const plantTurns = {
  job: "Mist the plants",
  people: [{ name: "Sam" }, { name: "Alex" }, { name: "Mia" }],
  at: 0,
};
export const examples = [
  plantTurns,
  {
    job: "Walk Clover",
    people: [{ name: "Alex" }, { name: "Jo" }],
    at: 1,
  },
  { ...plantTurns, lead: "none" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Turns");
export const probes = [
  choose("Whose turn it is to wash dishes, followed by the next two people, with Done next and Skip"),
  choose(
    "Show Sam, Alex and Mia together as a stack of portraits with their names, with no rotation",
    "People",
  ),
  write("Mist the plants rotates through Sam, Alex and Mia in that order, Sam is current"),
  {
    ...write(
      "Mist the plants rotates through Sam, Alex and Mia, starting with Sam. Show the names with no portraits or initials.",
    ),
    variant: { axis: "lead", value: "none" },
  },
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
  lead,
  emphasis,
}: {
  person: Person;
  current: boolean;
  startsQueue: boolean;
  lead: TurnsProps["lead"];
  emphasis: TurnsProps["emphasis"];
}) {
  const { words } = useWords(homeWordsFor);
  const scope = usePartContext();
  const { current: currentLabel, upcoming } = words.turnLabels;
  const portrait = lead === "avatar" && <TurnPortrait {...{ person, current }} />;
  const label = current ? words.turnHolder(currentLabel, person.name) : person.name;
  const body = (
    <KitContent>
      {startsQueue && <KitText role="label" tone="muted" part={null} children={upcoming} />}
      {current ? (
        <KitContent lead={portrait} leadingAlign="row">
          <KitText role="label" tone="muted" part={null} children={currentLabel} />
          <KitText role="title" part="name" children={person.name} {...{ emphasis }} />
        </KitContent>
      ) : portrait ? (
        <KitRow label={person.name} leading={portrait} inset="none">
          <KitText role="body" part="name" children={person.name} />
        </KitRow>
      ) : (
        <KitText role="body" part="name" children={person.name} />
      )}
    </KitContent>
  );
  return portrait ? (
    <KitRow item={person.id} label={label} inline>
      {body}
    </KitRow>
  ) : (
    <PartScope {...scope} item={person.id}>
      <KitCard style="plain" part="root" label={label}>
        {body}
      </KitCard>
    </PartScope>
  );
}

export function Turns({ job, visiblePeople, lead, emphasis }: TurnsProps) {
  const surface = "card";
  const { words } = useWords(homeWordsFor);
  const { next, skip } = words.turnLabels;
  const rows = visiblePeople.map((person, index) => (
    <TurnRow
      key={person.id}
      {...{ person, lead, emphasis }}
      current={index === 0}
      startsQueue={index === 1}
    />
  ));
  return (
    <KitCard part="root" padded {...{ surface }}>
      <KitText part="job" role="body" children={job} />
      {lead === "none" ? <KitContent>{rows}</KitContent> : rows}
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

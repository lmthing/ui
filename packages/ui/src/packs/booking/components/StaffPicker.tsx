import {
  useWords,
  KitCard,
  KitFigure,
  KitMetaLine,
  KitPhoto,
  KitRow,
  KitState,
  KitStrip,
  useComponentState,
  useKit,
} from "../../../kit";
import { bookingWordsFor } from "../lang";
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

// Core first: People/stack shows participants, not a booking provider choice with Anyone.
export const meta = {
  id: "StaffPicker",
  status: "ready",
  group: "input",
  purpose: "Choose who provides the booked service, or leave it to anyone.",
  pick: "Select a service provider for a booking, including Anyone. Not participants or people shown without selecting a provider (People).",
  writeHints: [
    "at is 0 for Anyone (only when anyone is true), 1 for the first staff member, 2 for the second. Use compact photo references such as local:1.",
    'Leave detail null unless requested. For avatars and names with no visible roles, use detail "brief" and keep the roles in the data.',
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "Each staff member has working hours and bookings in a shared app.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["role"] } },
  items: { key: "staff", parts: ["root", "name", "photo", "role"] },
  parts: ["root", "anyone", "anyone_photo", "anyone_name"],
  states: ["filled", "loading"],
  actions: { items: { root: ["select"] }, parts: { anyone: ["select"] }, when: { anyone: { anyone: true } } },
  select: { prop: "at", value: "position", parts: { anyone: 0 } },
  read: (input, _state, lang?: string) => {
    const { anyoneLabel } = bookingWordsFor(lang);
    return (input as { anyone: boolean }).anyone ? [anyoneLabel] : [];
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    staff: z
      .array(z.strictObject({ name: text(20), photo, role: text(20).optional() }))
      .min(1)
      .max(6),
    anyone: z.boolean().default(true),
    at: z.int().min(0).max(6).optional(),
  })
  .refine(({ staff, at, anyone }) => at === undefined || (at === 0 ? anyone : at <= staff.length), {
    path: ["at"],
  })
  .overwrite((value) =>
    value.detail === "brief"
      ? { ...value, staff: value.staff.map((person) => ({ ...person, role: undefined })) }
      : value,
  );
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const staff = itemsOf(cast, 3).map((item) => ({
    name: titleOf(item, 20, thing) || placeholderTitle(0, lang),
    photo: "local:1",
  }));
  return { staff: staff.length ? staff : [{ name: placeholderTitle(0, lang), photo: "local:1" }] };
}
const walkingStaff = {
  staff: [
    { name: "Sam", photo: "local:1", role: "Dog walker" },
    { name: "Alex", photo: "local:2", role: "Dog trainer" },
  ],
  anyone: false,
  at: 1,
};
export const examples = [
  { staff: [{ name: "Anna", photo: "lib:people", role: "Plant care" }], anyone: true, at: 0 },
  walkingStaff,
  { ...walkingStaff },
  { ...walkingStaff, detail: "brief" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("StaffPicker");
export const probes = [
  choose("Choose which staff member does my booked service, or let anyone available do it"),
  choose("Show the people coming on my walk as overlapping avatars", "People"),
  write("Choose between walkers Sam and Alex, allow anyone, select Sam"),
  {
    ...write(
      "Let me choose between Sam, a walker, and Alex, a trainer. Keep their roles but show just their photos and names, without the role captions.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Choose Anna for this booking", { address: "s1/r1", action: "select" }),
  read("Let any available person do this booking", { address: "s1/anyone", action: "select" }),
] satisfies Probe[];

export function StaffPicker({ staff, anyone, at }: Props<typeof props, typeof meta>) {
  const { anyoneLabel } = useWords(bookingWordsFor).words;
  const loading = useComponentState() === "loading";
  const density = useKit().density;
  const choices = [
    ...(anyone ? [{ id: undefined, name: anyoneLabel, photo: undefined, role: undefined, position: 0 }] : []),
    ...staff.map((person, index) => ({ ...person, position: index + 1 })),
  ];
  const rail = (
    <KitStrip density={density}>
      {choices.map((person) => (
        <KitRow
          key={person.position}
          {...(loading ? { part: null } : person.id ? { item: person.id } : { part: "anyone" })}
          label={person.name}
          {...(loading ? {} : { role: "button" as const })}
          inset="none"
          density={density}
          inline={density === "compact"}
        >
          <KitFigure
            density={density}
            media={
              <KitPhoto
                photo={person.photo}
                shape="avatar"
                part={loading ? null : person.id ? "photo" : "anyone_photo"}
                label={person.name}
                initials={person.name.slice(0, 1)}
                ring={at === person.position ? "accent" : "none"}
                loading={loading}
              />
            }
            caption={
              <KitMetaLine
                align="center"
                density={density}
                title={{ text: person.name, part: person.id ? "name" : "anyone_name", lines: 1 }}
                meta={{ text: person.role, part: "role", role: "caption" }}
              />
            }
          />
        </KitRow>
      ))}
    </KitStrip>
  );
  return (
    <KitCard part="root" padded density={density}>
      <KitState loading={rail} density={density}>
        {rail}
      </KitState>
    </KitCard>
  );
}

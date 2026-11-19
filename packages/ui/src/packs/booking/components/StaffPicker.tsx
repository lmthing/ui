import {
  useWords,
  KitCard,
  KitContent,
  KitPhoto,
  KitRow,
  KitSkeleton,
  KitStrip,
  KitText,
  useComponentState,
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
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "Each staff member has working hours and bookings in a shared app.",
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
    staff: z
      .array(z.strictObject({ name: text(20), photo, role: text(20).optional() }))
      .min(1)
      .max(6),
    anyone: z.boolean().default(true),
    at: z.int().min(0).max(6).optional(),
  })
  .refine(({ staff, at, anyone }) => at === undefined || (at === 0 ? anyone : at <= staff.length), {
    path: ["at"],
  });
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const staff = itemsOf(cast, 3).map((item) => ({
    name: titleOf(item, 20, thing) || placeholderTitle(0, lang),
    photo: "local:1",
  }));
  return { staff: staff.length ? staff : [{ name: placeholderTitle(0, lang), photo: "local:1" }] };
}
export const examples = [
  { staff: [{ name: "Anna", photo: "lib:people", role: "Plant care" }], anyone: true, at: 0 },
  {
    staff: [
      { name: "Sam", photo: "lib:people", role: "Walker" },
      { name: "Alex", photo: "lib:people" },
    ],
    anyone: false,
    at: 1,
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("StaffPicker");
export const probes = [
  choose("Choose which staff member does my booked service, or let anyone available do it"),
  choose("Show the people coming on my walk as overlapping avatars", "People"),
  write("Choose between walkers Sam and Alex, allow anyone, select Sam"),
  read("Choose Anna for this booking", { address: "s1/r1", action: "select" }),
  read("Let any available person do this booking", { address: "s1/anyone", action: "select" }),
] satisfies Probe[];

function StaffLoading({ name, role }: { name: string; role?: string | undefined }) {
  return (
    <KitRow label={name} inset="none">
      <KitSkeleton
        shape="media"
        aspect="avatar"
        inset="none"
        content={[
          ["body", name, "center"],
          ["caption", role, "center"],
        ]}
      />
    </KitRow>
  );
}

export function StaffPicker({ staff, anyone, at }: Props<typeof props, typeof meta>) {
  const { anyoneLabel } = useWords(bookingWordsFor).words;
  const loading = useComponentState() === "loading";
  const choices = [
    ...(anyone ? [{ id: undefined, name: anyoneLabel, photo: undefined, role: undefined, position: 0 }] : []),
    ...staff.map((person, index) => ({ ...person, position: index + 1 })),
  ];
  return (
    <KitCard part="root" padded>
      <KitStrip>
        {choices.map((person) =>
          loading ? (
            <StaffLoading key={person.position} name={person.name} role={person.role} />
          ) : (
            <KitRow
              key={person.position}
              {...(person.id ? { item: person.id } : { part: "anyone" })}
              label={person.name}
              role="button"
              inset="none"
            >
              <KitPhoto
                {...(person.photo ? { photo: person.photo } : {})}
                shape="avatar"
                part={person.id ? "photo" : "anyone_photo"}
                label={person.name}
                initials={person.name.slice(0, 1)}
                ring={at === person.position ? "accent" : "none"}
              />
              <KitContent lineRole="body">
                <KitText role="body" part={person.id ? "name" : "anyone_name"} align="center" lines={1}>
                  {person.name}
                </KitText>
                {person.role && (
                  <KitText role="caption" tone="muted" part="role" align="center">
                    {person.role}
                  </KitText>
                )}
              </KitContent>
            </KitRow>
          ),
        )}
      </KitStrip>
    </KitCard>
  );
}

import {
  useWords,
  KitAvatarStack,
  KitCard,
  KitEmpty,
  KitIcon,
  KitPhoto,
  KitRow,
  KitText,
  useComponentState,
} from "../kit";
import { z } from "zod";
import {
  probesFor,
  detailOf,
  itemsOf,
  moreLine,
  photo,
  placeholderTitle,
  screenId,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";

export const meta = {
  id: "People",
  group: "content",
  purpose: "Who else is involved, with their names and roles.",
  pick: "The clients, family or team involved, with a name and optional role for each person. Not general things to scan and tap (List), or the identity of one screen's subject (Profile).",
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "The people involved and their roles in a shared app.",
  items: { key: "members", parts: ["root", "photo", "name", "role"] },
  parts: ["root", "more"],
  states: ["filled", "empty"],
  actions: { items: { root: ["press"] } },
  read: (input, _state, lang?: string) => {
    const { more } = input as { more?: number };
    return more ? [moreLine(more, lang)] : [];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    style: z.enum(["rows", "stack"]).default("rows"),
    more: z.int().min(1).max(999).optional(),
    members: z
      .array(
        z.strictObject({
          name: text(24),
          role: text(24).optional(),
          photo: photo.optional(),
          goto: screenId.optional(),
        }),
      )
      .min(1)
      .max(6)
      // Like List, expose the optional root action only for members with navigation.
      .transform((members) => members.map((member) => ({ ...member, root: member.goto }))),
  })
  // A count of more people means a stack, and a stack shows people without opening them.
  .overwrite((value) =>
    value.style === "stack" || value.more !== undefined
      ? {
          ...value,
          style: "stack" as const,
          members: value.members.map((member) => ({ ...member, goto: undefined, root: undefined })),
        }
      : value,
  );

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const members = itemsOf(cast, 3).flatMap((item) => {
    const name = titleOf(item, 24, thing);
    const role = detailOf(item, 24, thing);
    return name ? [{ name, ...(role ? { role } : {}) }] : [];
  });
  return {
    members: members.length ? members : [0, 1, 2].map((index) => ({ name: placeholderTitle(index, lang) })),
  };
}

export const examples = [
  { members: [{ name: "Maya", role: "Waters on weekends" }] },
  {
    members: [
      { name: "Anna", role: "Clover's owner", photo: "lib:people", goto: "anna" },
      { name: "Ben", role: "Pip's owner", goto: "ben" },
    ],
  },
  {
    style: "stack",
    more: 3,
    members: [{ name: "Anna", photo: "lib:people" }, { name: "Ben" }, { name: "Carla", photo: "lib:people" }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("People");
export const probes = [
  choose("Show everyone who helps care for our plants, with their names and what each person does"),
  choose("At the top of Anna's page, show her picture and name so I know whose page this is", "Profile"),
  write("Show Anna, Clover's owner, and Ben, Pip's owner, with a way to open each person's page"),
  write(
    "Show the three people going to the walk as small overlapping pictures, and that 3 more are going too",
  ),
  read("Open Anna", { address: "p1/r1", action: "press" }, 1),
] satisfies Probe[];

export function People({ style, members, more }: Props<typeof props, typeof meta>) {
  const { lang } = useWords();
  const state = useComponentState();
  if (state === "empty") {
    return (
      <KitCard part="root">
        <KitEmpty icon="users" part="name" />
      </KitCard>
    );
  }
  if (style === "stack") {
    return (
      <KitCard part="root" padded>
        <KitAvatarStack
          members={members.map((member) => ({ id: member.id, label: member.name, photo: member.photo }))}
        >
          {more && (
            <KitText role="label" tone="muted" part="more">
              {moreLine(more, lang)}
            </KitText>
          )}
        </KitAvatarStack>
      </KitCard>
    );
  }
  return (
    <KitCard part="root">
      {members.map((member) => (
        <KitRow
          leadingAlign={member.photo ? "row" : "line"}
          leadingWidth={members.some((person) => person.photo) ? "avatar" : undefined}
          key={member.id}
          item={member.id}
          label={member.name}
          goto={member.goto}
          leading={
            member.photo ? (
              <KitPhoto photo={member.photo} shape="round" part="photo" label={member.name} />
            ) : (
              <KitIcon name="user" part="photo" />
            )
          }
          trailing={member.goto ? <KitIcon name="chevron_right" decorative /> : undefined}
        >
          <KitText role="body" part="name">
            {member.name}
          </KitText>
          {member.role && (
            <KitText role="caption" tone="muted" part="role">
              {member.role}
            </KitText>
          )}
        </KitRow>
      ))}
    </KitCard>
  );
}

import { z } from "zod";
import {
  detailOf,
  itemsOf,
  photo,
  placeholderTitle,
  screenId,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitCard, KitEmpty, KitIcon, KitPhoto, KitRow, KitText, useComponentState } from "../kit";

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
  parts: ["root"],
  states: ["filled", "empty"],
  actions: { items: { root: ["press"] } },
  aliases: ["members", "participants", "household", "team"],
} as const satisfies Meta;

export const props = z.strictObject({
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
});

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const members = itemsOf(cast, 3).flatMap((item) => {
    const name = titleOf(item, 24, thing);
    const role = detailOf(item, 24, thing);
    return name ? [{ name, ...(role ? { role } : {}) }] : [];
  });
  return {
    members: members.length ? members : [0, 1, 2].map((index) => ({ name: placeholderTitle(index) })),
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
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "Show everyone who helps care for our plants, with their names and what each person does",
    expect: "People",
  },
  {
    kind: "choose",
    need: "At the top of Anna's page, show her portrait and name so I know whose page this is",
    expect: "Profile",
  },
  {
    kind: "write",
    brief: "Show Anna, Clover's owner, and Ben, Pip's owner, with a way to open each person's page",
    expect: "People",
  },
  {
    kind: "read",
    screen: 1,
    task: "Open Anna",
    expect: { address: "p1/r1", action: "press" },
  },
] satisfies Probe[];

export function People({ members }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  if (state === "empty") {
    return (
      <KitCard part="root">
        <KitEmpty icon="users" part="name" />
      </KitCard>
    );
  }
  return (
    <KitCard part="root">
      {members.map((member) => (
        <KitRow
          leadingAlign="row"
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

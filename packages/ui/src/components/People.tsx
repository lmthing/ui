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
  useVariant,
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
  variantProps,
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
  writeHints: [
    'Keep "density":null and "surface":null unless their appearance is requested. Set "detail":null even when role is absent or when drawing a stack. Only an explicit request to hide existing roles means "detail":"brief"; keep those roles in role. If asked to show roles, never use brief. Use style "stack" only for overlapping avatars.',
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "The people involved and their roles in a shared app.",
  items: { key: "members", parts: ["root", "photo", "name", "role"] },
  parts: ["root", "more"],
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["role"] } },
  states: ["filled", "empty"],
  actions: { items: { root: ["press"] } },
  read: (input, _state, lang?: string) => {
    const { more } = input as { more?: number };
    return more ? [moreLine(more, lang)] : [];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    style: z.literal("stack").optional(),
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
  .overwrite((value) => {
    const stack = value.style === "stack" || value.more !== undefined;
    return {
      ...value,
      style: stack ? "stack" : undefined,
      members: value.members.map((member) => ({
        ...member,
        ...(stack ? { goto: undefined, root: undefined } : {}),
        ...(stack || value.detail === "brief" ? { role: undefined } : {}),
      })),
    };
  });

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

const walkMembers = [
  { name: "Anna", role: "Clover's owner", photo: "lib:anna", goto: "anna" },
  { name: "Ben", role: "Pip's owner", goto: "ben" },
];

export const examples = [
  { members: [{ name: "Maya", role: "Waters on weekends" }] },
  { members: walkMembers },
  {
    style: "stack",
    more: 3,
    members: [{ name: "Anna", photo: "lib:anna" }, { name: "Ben" }, { name: "Carla", photo: "lib:carla" }],
  },
  { detail: "brief", members: walkMembers },
  { density: "compact", members: walkMembers },
  { surface: "outlined", members: walkMembers },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("People");
export const probes = [
  choose("Show everyone who helps care for our plants, with their names and what each person does"),
  choose("At the top of Anna's page, show her picture and name so I know whose page this is", "Profile"),
  write("Show Anna, Clover's owner, and Ben, Pip's owner, with a way to open each person's page"),
  write(
    "Show the three people going to the walk as small overlapping pictures, and that 3 more are going too",
  ),
  {
    ...write(
      "List Maya and Anna by name, but keep their roles (weekend watering and weekday watering) out of the display.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open Anna", { address: "p1/r1", action: "press" }, 1),
] satisfies Probe[];

type PeopleProps = Props<typeof props, typeof meta>;

function MemberRows({ members, density }: Pick<PeopleProps, "members" | "density">) {
  const reserve = members.some((person) => person.photo);
  return members.map((member) => (
    <KitRow
      density={density}
      leadingAlign={member.photo && member.role ? "row" : "line"}
      leadingWidth={reserve ? "avatar" : undefined}
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
      <KitText role="body" part="name" density={density}>
        {member.name}
      </KitText>
      {member.role && (
        <KitText role="caption" tone="muted" part="role" density={density}>
          {member.role}
        </KitText>
      )}
    </KitRow>
  ));
}

// prettier-ignore
export function People({ style, members, more, surface, density: inputDensity }: PeopleProps) {
  const { lang } = useWords();
  const state = useComponentState();
  const density = useVariant("density", meta.variants.density, inputDensity);
  return <KitCard part="root" {...{ surface, density }} padded={style === "stack" && state !== "empty"}>
    {state === "empty" ? <KitEmpty icon="users" part="name" /> :
      style === "stack" ? <KitAvatarStack members={members.map(({ id, name, photo }) => ({ id, label: name, photo }))}>
        {more && <KitText role="number" numberScale="compact" tone="muted" part="more" density={density}>{moreLine(more, lang)}</KitText>}
      </KitAvatarStack> : <MemberRows {...{ members, density }} />}
  </KitCard>;
}

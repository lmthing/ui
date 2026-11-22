import * as kit from "../kit";
import { z } from "zod";
// prettier-ignore
import {
  probesFor, detailOf, itemsOf, moreLine, photo, placeholderTitle, screenId, text, thingOf, titleOf,
  variantProps, wordsFor, type FallbackInput, type Meta, type Probe, type Props,
} from "../catalog";
import { prompt } from "../entry/prompt-People.generated";

export const meta = {
  id: "People",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "The people involved and their roles in a shared app.",
  items: { key: "members", parts: ["root", "photo", "name", "role", "online", "status_text"] },
  parts: ["root", "more"],
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["role"] } },
  states: ["filled", "empty"],
  actions: { items: { root: ["press"] } },
  read: (input, _state, lang?: string): string[] => {
    const { style, members, more } = input as PeopleProps;
    if (more) return [moreLine(more, lang)];
    return style === "rail"
      ? members.flatMap(({ id, online }) => (online ? [`${id}: ${wordsFor(lang).onlineLabel}`] : []))
      : [];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    style: z.enum(["stack", "rail"]).optional(),
    more: z.int().min(1).max(999).optional(),
    members: z
      .array(
        z.strictObject({
          name: text(24),
          role: text(24).optional(),
          photo: photo.optional(),
          goto: screenId.optional(),
          online: z.boolean().optional(),
          ring: z.enum(["none", "accent", "muted"]).optional(),
          statusText: text(24).optional(),
        }),
      )
      .min(1)
      .max(6)
      // Like List, expose the optional root action only for members with navigation.
      .transform((members) => members.map((member) => ({ ...member, root: member.goto }))),
  })
  .refine(({ style, more }) => style !== "rail" || more === undefined, { path: ["more"] })
  // A count of more people means a stack, and a stack shows people without opening them.
  .overwrite((value) => {
    const stack = value.style === "stack" || value.more !== undefined;
    return {
      ...value,
      style: stack ? "stack" : value.style,
      members: value.members.map((member) => ({
        ...member,
        ...(stack ? { goto: undefined, root: undefined } : {}),
        ...(stack || value.detail === "brief" ? { role: undefined } : {}),
        ...(member.statusText !== undefined && (value.style !== "rail" || stack)
          ? { statusText: undefined }
          : {}),
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

// prettier-ignore
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
  { style: "rail", members: [
    { name: "Anna", online: true, statusText: "At the park", goto: "anna" },
    { name: "Ben", ring: "muted", statusText: "On a walk" }, { name: "Carla" },
  ] },
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
  {
    ...write(
      "Show only Anna in a sideways portrait strip. She's online now with an accent ring and the status At the park.",
    ),
    expectProps: {
      style: "rail",
      members: [{ name: "Anna", online: true, ring: "accent", statusText: "At the park" }],
    },
  },
] satisfies Probe[];

type PeopleProps = Props<typeof props, typeof meta>;

// prettier-ignore
function MemberRows({ members, density }: Pick<PeopleProps, "members" | "density">) {
  const reserve = members.some((person) => person.photo);
  return members.map((member) => (
    <kit.KitRow key={member.id} item={member.id} label={member.name} goto={member.goto} density={density}
      leadingAlign={member.photo && member.role ? "row" : "line"} leadingWidth={reserve ? "avatar" : undefined}
      leading={member.photo ? <kit.KitPhoto photo={member.photo} shape="round" part="photo" label={member.name} />
        : <kit.KitIcon name="user" part="photo" />}
      trailing={member.goto ? <kit.KitIcon name="chevron_right" decorative /> : undefined}>
      <kit.KitText role="body" part="name" density={density}>{member.name}</kit.KitText>
      {member.role && <kit.KitText role="caption" tone="muted" part="role" density={density}>
        {member.role}
      </kit.KitText>}
    </kit.KitRow>
  ));
}

// prettier-ignore
function MemberRail({ members, density }: Pick<PeopleProps, "members" | "density">) {
  const { words } = kit.useWords();
  const cards = members.map((member) =>
    <kit.KitRow key={member.id} item={member.id} label={member.name} goto={member.goto} surface="plain" density={density}>
      <kit.KitContent align="center" density={density}>
        <kit.KitPhoto shape="round" part="photo" photo={member.photo} label={member.name}
          initials={Array.from(member.name)[0]} ring={member.ring ?? (member.online ? "accent" : "none")} />
        <kit.KitText align="center" part="name" lines={2} density={density}>{member.name}</kit.KitText>
        {member.statusText && <kit.KitTrail kind="badge" tone="text" part="status_text" value={member.statusText} />}
        {member.role && <kit.KitText align="center" role="caption" tone="muted" part="role" density={density}>{member.role}</kit.KitText>}
        {member.online && <kit.KitText align="center" role="caption" tone="good" part="online">{words.onlineLabel}</kit.KitText>}
      </kit.KitContent>
    </kit.KitRow>
  );
  const pages = cards.filter((_, index) => index % 2 === 0).map((card, page) =>
    <kit.KitRow key={card.key} label={members[page * 2]!.name} part={null} surface="card" inline>
      <kit.KitGrid density={density} list>{cards.slice(page * 2, page * 2 + 2)}</kit.KitGrid>
    </kit.KitRow>);
  return <kit.KitStrip density={density} overflow="page">{pages}</kit.KitStrip>;
}

// prettier-ignore
export function People({ style, members, more, surface, density: inputDensity }: PeopleProps) {
  const { lang } = kit.useWords();
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, inputDensity);
  const railCards = style === "rail" && surface === "card";
  return <kit.KitCard part="root" {...(railCards && { style: "cards" as const })} {...{ surface, density }}
    padded={style !== undefined && state !== "empty"}>
    {state === "empty" ? <kit.KitEmpty icon="users" part="name" /> :
      style === "stack" ? <kit.KitAvatarStack members={members.map(({ id, name, photo }) => ({ id, label: name, photo }))}>
        {more && <kit.KitText role="number" numberScale="compact" tone="muted" part="more" density={density}>{moreLine(more, lang)}</kit.KitText>}
      </kit.KitAvatarStack> : style === "rail" ? <MemberRail {...{ members, density }} /> : <MemberRows {...{ members, density }} />}
  </kit.KitCard>;
}

import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { inviteJoinedLine, inviteReading, liveRoomSpeakerInitials } from "../copy";
import { socialWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Invite.generated";

// Core first: People/default draws a current roster, not a copyable, shareable QR invite and its join count.
export const meta = {
  id: "Invite",
  status: "ready",
  group: "action",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "An invite code from a shared app; sharing uses the phone’s share sheet.",
  variants: {
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["joined"] } },
  parts: [
    "root",
    "title",
    "code",
    "qr",
    "joined",
    "copy",
    "copy_label",
    "share",
    "share_label",
    "members_title",
  ],
  items: { key: "members", parts: ["root", "name", "photo"], addressedWhen: { style: "starter_pack" } },
  states: ["filled"],
  actions: { parts: { copy: ["press"], share: ["press"] } },
  read: inviteReading,
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    style: z.enum(["code", "starter_pack"]).optional(),
    members: z
      .array(z.strictObject({ name: c.text(24), photo: c.photo.optional() }))
      .min(1)
      .max(4)
      .optional(),
    title: c.text(32),
    code: c.text(12),
    joined: z.int().min(0).max(999999).optional(),
    qr: z.boolean(),
  })
  .refine(({ style, members }) => (style === "starter_pack") === Boolean(members), {
    path: ["members"],
    message: "Members are required only for a starter pack",
  });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const item = c.itemsOf(cast, 1)[0];
  return {
    title: (item && c.titleOf(item, 32, thing)) || c.placeholderTitle(0, lang),
    code: c.wordsFor(lang).placeholderValue,
    qr: false,
  };
}

export const examples = [
  { title: "Invite to Fernpost", code: "FERN28", joined: 6, qr: true },
  { title: "Invite a walking buddy", code: "TROT9", qr: false },
  {
    style: "starter_pack",
    title: "Fernpost starter pack",
    code: "FERN28",
    qr: false,
    members: [{ name: "Maya", photo: "lib:people_maya" }, { name: "Sam" }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Invite");
export const probes = [
  choose(
    "Let members bring friends in with a join code they can copy or share. Also show a QR and how many people joined using it.",
  ),
  choose(
    "Show the existing walking group members, with their names and avatars. No join code or invitations.",
    "People",
  ),
  write(
    "Invite people to Fernpost with the code FERN28, a scannable QR, and a count of six who already joined.",
  ),
  {
    ...write(
      "Invite Trot walkers with code TROT9 and a scannable QR. Three people have already joined using it. Keep their count in the data without displaying it. Leave spacing, framing and alignment at their defaults.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  {
    ...write(
      'Invite people with the title "Fernpost starter pack" and code FERN28. Make this a shareable starter pack of two people to discover, Maya then Sam, without a QR.',
    ),
    expectProps: {
      style: "starter_pack",
      members: [{ name: "Maya" }, { name: "Sam" }],
      code: "FERN28",
      qr: false,
    },
  },
  read("Copy the Fernpost invite code.", { address: "i1/copy", action: "press" }),
  read("Share the Fernpost invite code.", { address: "i1/share", action: "press" }),
] satisfies c.Probe[];

type InviteProps = c.Props<typeof props, typeof meta>;

export function Invite(input: InviteProps) {
  const { title, code, qr, joined } = input;
  const { lang, words } = kit.useWords(socialWordsFor);
  const density = kit.useKit().density;
  const surface = "card";
  const align = "start";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const joinedLine = inviteJoinedLine({ joined, detail }, lang);
  const group = density === "compact" ? "content" : "response";
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      <kit.KitContent {...{ align, density }}>
        <kit.KitText part="title" role="heading" emphasis="quiet" {...{ align, density }}>
          {title}
        </kit.KitText>
        <kit.KitText
          part="code"
          role="number"
          numberScale="compact"
          emphasis="hero"
          tabular
          {...{ align, density }}
        >
          {code}
        </kit.KitText>
        {joinedLine !== undefined && (
          <kit.KitText part="joined" role="label" tone="muted" align={align}>
            {joinedLine}
          </kit.KitText>
        )}
      </kit.KitContent>
      {input.style === "starter_pack" && input.members && (
        <InviteMembers members={input.members} density={density} />
      )}
      {qr && (
        <kit.KitContent {...{ group, density }}>
          <kit.KitCode part="qr" value={code} label={words.invite.qr} />
        </kit.KitContent>
      )}
      <kit.KitContent group={qr ? "response" : group} density={density}>
        <kit.KitGrid density={density}>
          <kit.KitAction part="copy" action="press" kind="secondary" label={words.invite.copy} full />
          <kit.KitAction part="share" action="press" label={words.invite.share} full />
        </kit.KitGrid>
      </kit.KitContent>
    </kit.KitCard>
  );
}

function InviteMembers({
  members,
  density,
}: {
  members: NonNullable<InviteProps["members"]>;
  density: c.ThemeDensity;
}) {
  const {
    words: { invite },
  } = kit.useWords(socialWordsFor);
  return (
    <kit.KitContent group="response" density={density}>
      <kit.KitHeader
        title={{ text: invite.members, part: "members_title", role: "meta", strong: true }}
        density={density}
      />
      <kit.KitGrid density={density} list>
        {members.map(({ id, name, photo }) => (
          <kit.KitRow
            key={id}
            item={id}
            part="root"
            inset="none"
            label={name}
            inline
            fitContent
            density={density}
          >
            <kit.KitContent density={density}>
              <kit.KitPhoto
                photo={photo}
                part={photo ? "photo" : null}
                label={name}
                shape="round"
                initials={liveRoomSpeakerInitials(name)}
              />
              <kit.KitLayoutText line={{ text: name, part: "name" }} density={density} />
            </kit.KitContent>
          </kit.KitRow>
        ))}
      </kit.KitGrid>
    </kit.KitContent>
  );
}

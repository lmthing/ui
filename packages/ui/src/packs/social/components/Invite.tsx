import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { inviteJoinedLine, inviteReading } from "../copy";
import { socialWordsFor } from "../lang";

// Core first: People/default draws a current roster, not a copyable, shareable QR invite and its join count.
export const meta = {
  id: "Invite",
  status: "ready",
  group: "action",
  purpose: "Bring new members in with a code they can share or scan.",
  pick: "Invite people to join an app or group using a copyable, shareable code and optional QR. Not sharing a post (Post) or listing existing members (People).",
  writeHints: [
    'If the brief says to keep the number who joined without displaying it, write both fields: "joined":3,"detail":"brief" (use the supplied number, not necessarily 3). A null detail shows the count, so use null only when hiding the count was not requested.',
    "The joined field is null only if the count is unknown. Set qr to true for a scannable version of code.",
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "An invite code from a shared app; sharing uses the phone’s share sheet.",
  variants: {
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["joined"] } },
  parts: ["root", "title", "code", "qr", "joined", "copy", "copy_label", "share", "share_label"],
  states: ["filled"],
  actions: { parts: { copy: ["press"], share: ["press"] } },
  read: inviteReading,
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  title: c.text(32),
  code: c.text(12),
  joined: z.int().min(0).max(999999).optional(),
  qr: z.boolean(),
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

import { z } from "zod";
import * as c from "../../../catalog";

// Core first: People/roster lists current members, not a shareable invite code and its join count.
export const meta = {
  id: "Invite",
  status: "draft",
  group: "action",
  purpose: "Bring new members in with a code they can share or scan.",
  pick: "Invite people to join an app or group using a copyable, shareable code and optional QR. Not sharing a post (Post) or listing existing members (People).",
  writeHints: [
    "Write qr true to show a scannable version of the same code. joined is a count, not a list of people.",
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "An invite code from a shared app; sharing uses the phone’s share sheet.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    align: ["start", "center"],
  },
  parts: ["root", "title", "code", "qr", "joined", "copy", "share"],
  states: ["filled"],
  actions: { parts: { copy: ["press"], share: ["press"] } },
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
  {
    density: "compact",
    surface: "outlined",
    align: "center",
    title: "Invite a walking buddy",
    code: "TROT9",
    qr: false,
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
  read("Copy the Fernpost invite code.", { address: "i1/copy", action: "press" }),
] satisfies c.Probe[];

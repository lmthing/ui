import { z } from "zod";
import * as c from "../../../catalog";
import { distinct, ref, seedDate, seedTitle } from "../seeds";

// Core first: People/rows shows names and roles, not membership dates, voting rights or reconciled dues.
export const meta = {
  id: "Members",
  status: "draft",
  group: "data",
  purpose: "Keep membership records, voting rights and dues badges together.",
  pick: "A group's official membership register with joining or leaving dates, voting rights and dues badges. Not a small directory (People), one person's identity (Profile), business clients (ClientCard) or event guests (GuestList).",
  writeHints: [
    "Use unique snake_case member ids. Leave ended unset for continuing members; when supplied it must not precede joined. Dues badges are computed by the host.",
    'For names, primary roles and badges only, write detail "brief" and keep the dates, roles and photo in the data. Hiding extra details does not request different row spacing: write density null unless the person expressly asks for tighter or roomier spacing.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The secretary can keep records on one device, while member access requires a shared app.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["joined", "ended", "photo", "other_roles"] } },
  parts: ["root"],
  items: {
    key: "members",
    parts: [
      "root",
      "name",
      "role",
      "other_roles",
      "joined",
      "ended",
      "voting_rights",
      "photo",
      "dues",
      "end",
    ],
  },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    items: { root: ["press"], end: ["press"] },
    when: { root: { linked: true }, end: { can_end: true } },
    noGoto: { items: ["end"] },
  },
  confirmParts: ["end"],
  live: { derive: briefRows },
} as const satisfies c.Meta;

const member = z
  .strictObject({
    id: ref,
    name: c.text(24),
    roles: z.array(c.text(24)).min(0).max(3),
    joined: c.isoDate,
    ended: c.isoDate.optional(),
    votingRights: z.boolean(),
    photo: c.photo.optional(),
    goto: c.screenId.optional(),
  })
  .refine(({ joined, ended }) => !ended || joined <= ended, { path: ["ended"] });

export const props = z
  .strictObject({ ...c.variantProps(meta.variants), members: z.array(member).min(1).max(30) })
  .refine(({ members }) => distinct(members, (row) => row.id), { path: ["members"] })
  .overwrite((input) => ({
    ...input,
    members: input.members.map((row) => ({
      ...row,
      memberId: row.id,
      linked: Boolean(row.goto),
    })),
  }));

function briefRows(input: Readonly<c.Values>): c.Values {
  if (input.detail !== "brief") return {};
  const { members } = input as z.output<typeof props>;
  return {
    members: members.map((row) => ({
      ...row,
      joined: undefined,
      ended: undefined,
      photo: undefined,
      roles: row.roles.slice(0, 1),
    })),
  };
}

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    members: [{ id: "item_1", name: seedTitle(input, 24), roles: [], joined: seedDate, votingRights: false }],
  };
}

export const examples: z.input<typeof props>[] = [
  {
    members: [
      {
        id: "ana",
        name: "Ana Reed",
        roles: ["Secretary", "Plot steward"],
        joined: "2024-03-12",
        votingRights: true,
        photo: "lib:people",
        goto: "ana",
      },
      {
        id: "cal",
        name: "Cal Webb",
        roles: [],
        joined: "2024-06-05",
        ended: "2026-10-01",
        votingRights: false,
      },
    ],
  },
  {
    density: "compact",
    detail: "brief",
    members: [
      {
        id: "lee",
        name: "Lee Ortiz",
        roles: ["Treasurer", "Librarian"],
        joined: "2025-02-09",
        votingRights: true,
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Members");
export const probes = [
  choose(
    "Show our allotment association's official register: when each member joined or left, whether they can vote and their dues badge.",
  ),
  choose(
    "Show a little directory of names, faces and roles for our club officers. No join dates, rights or subscriptions.",
    "People",
  ),
  write(
    "Put Ana Reed in our official membership register as Secretary, joined 2024-03-12, with voting rights. Link to ana.",
  ),
  {
    ...write(
      "Register Ana Reed, Secretary and Plot steward, joined 2024-03-12, with voting rights. Show only names, primary roles and badges; keep the full register data.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open Ana Reed's membership record.", { address: "m1/r1", action: "press" }),
] satisfies c.Probe[];

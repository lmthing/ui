import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { memberFacts, memberReading, membersProjection, previewMemberDues } from "../copy";
import { communityWordsFor } from "../lang";
import { distinct, ref, seedDate, seedTitle } from "../seeds";
import { prompt } from "../../../entry/prompt-Members.generated";

// Core first: People/rows shows names and roles, not membership dates, voting rights or reconciled dues.
// prettier-ignore
export const meta = {
  id: "Members",
  status: "ready" as "ready" | "draft",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The secretary can keep records on one device, while member access requires a shared app.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["joined", "ended", "photo", "other_roles"] } },
  parts: ["root", "empty"],
  items: {
    key: "members",
    parts: ["root", "name", "role", "other_roles", "joined", "ended", "voting_rights",
      "photo", "dues", "badge", "committee", "end", "end_label"],
  },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    items: { root: ["press"], end: ["press"] },
    when: { root: { linked: true }, end: { can_end: true } },
    noGoto: { items: ["end"] },
  },
  confirmParts: ["end"],
  live: { derive: membersProjection() },
  deviceData: ["member_dues"],
  previewDeviceData: previewMemberDues,
  read: memberReading,
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
    badge: c.text(16).optional(),
    committee: c.text(24).optional(),
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
        roles: ["Volunteer"],
        joined: "2024-06-05",
        ended: "2026-10-01",
        votingRights: false,
      },
    ],
  },
  {
    detail: "brief",
    members: [
      {
        id: "lee",
        name: "Lee Ortiz",
        roles: ["Walk leader", "Treasurer"],
        joined: "2025-02-09",
        votingRights: true,
        badge: "Keyholder",
        committee: "Events",
      },
      { id: "jo", name: "Jo Bell", roles: ["Route steward"], joined: "2025-04-07", votingRights: false },
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
  {
    ...write(
      "Register Ana Reed as the sole member, joined 2024-03-12, with voting rights and the exact badge Keyholder.",
    ),
    expectProps: { members: [{ badge: "Keyholder" }] },
  },
  {
    ...write(
      "Register Ana Reed as the sole member, joined 2024-03-12, with voting rights. She serves on the committee named Events. Record Events as the committee name, not a badge or a role.",
    ),
    expectProps: { members: [{ committee: "Events" }] },
  },
  read("Open Ana Reed's membership record.", { address: "m1/r1", action: "press" }),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type Row = Omit<View["members"][number], "joined"> & {
  memberId: string;
  joined?: string | undefined;
  can_end?: boolean;
};
type Density = c.ThemeDensity;

// prettier-ignore
function MemberRow({ row, density, loading }: { row: Row; density: Density; loading: boolean }) {
  const scope = kit.usePartContext();
  const { lang, words: { members: w } } = kit.useWords(communityWordsFor);
  const { voting, joined, ended, otherRoles, dues, badge, committee } = memberFacts(row, kit.useDeviceData(), lang);
  const photo = row.photo || joined ? <kit.KitPhoto part={!loading && row.photo ? "photo" : null}
    shape="round" photo={row.photo} label={row.name} initials={Array.from(row.name)[0]} loading={loading} /> : undefined;
  const duesBadge = dues && <kit.KitTrail kind="badge" part="dues" tone={dues.tone} value={dues.label} density={density} />;
  const fields = { role: row.roles[0], other_roles: otherRoles, joined, ended, voting_rights: voting, committee };
  return <kit.PartScope {...scope} item={row.id}>
    <kit.KitRow part={loading ? null : "root"} label={row.name} inset="none" density={density}
      goto={loading ? undefined : row.goto} leading={photo} leadingAlign="row" trailing={duesBadge}>
      <kit.KitContent density={density} rhythm="flush">
        <kit.KitLayoutText density={density} line={{ text: row.name, part: "name", strong: true }} />
        {Object.entries(fields).map(([part, text]) => <kit.KitLayoutText key={part} density={density}
          line={{ text, part, role: "meta", tone: "muted" }} />)}
        {badge && <kit.KitLayoutText density={density} line={{ text: badge, part: "badge", role: "meta", tone: "muted" }} />}
      </kit.KitContent>
    </kit.KitRow>
    {row.can_end && <kit.KitActionFooter density={density}>
      <kit.KitAction part={loading ? null : "end"} action="press" kind="danger" label={w.end} />
    </kit.KitActionFooter>}
  </kit.PartScope>;
}

// prettier-ignore
export function Members(input: View) {
  const state = kit.useComponentState();
  const density = kit.useKit().density;
  const { members } = kit.useLiveControls(meta, input) as { members: Row[] };
  const { words: { members: w } } = kit.useWords(communityWordsFor);
  const rows = <kit.KitRowGroup density={density} leadingWidth={members.some((row) => row.photo || row.joined) ? "avatar" : undefined}>
    {members.map((row) => <MemberRow key={row.id} row={row} density={density} loading={state === "loading"} />)}
  </kit.KitRowGroup>;
  const message = state === "success" ? w.saved : state === "error" ? w.error : undefined;
  return <kit.KitCard part="root" density={density} padded={state === "filled" || state === "loading"}>
    <kit.KitState part={state === "empty" ? "empty" : null} icon={state === "empty" ? "users" : undefined}
      loading={rows} {...{ message, density }}>{rows}</kit.KitState>
  </kit.KitCard>;
}

import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { memberFacts, memberReading, membersProjection, previewMemberDues } from "../copy";
import { communityWordsFor } from "../lang";
import { distinct, ref, seedDate, seedTitle } from "../seeds";

// Core first: People/rows shows names and roles, not membership dates, voting rights or reconciled dues.
export const meta = {
  id: "Members",
  status: "ready" as "ready" | "draft",
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
  parts: ["root", "empty"],
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
      "end_label",
    ],
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
  read("Open Ana Reed's membership record.", { address: "m1/r1", action: "press" }),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type Row = Omit<View["members"][number], "joined"> & {
  memberId: string;
  joined?: string | undefined;
  can_end?: boolean;
};
type Density = c.AxisValue<"density">;

// prettier-ignore
function MemberRow({ row, density, loading }: { row: Row; density: Density; loading: boolean }) {
  const { lang, words: { members: w } } = kit.useWords(communityWordsFor);
  const { voting, joined, ended, otherRoles, dues } = memberFacts(row, kit.useDeviceData(), lang);
  const photo = row.photo ? <kit.KitPhoto part="photo" shape="round"
    {...(loading ? {} : { photo: row.photo, label: row.name })} />
    : joined ? loading ? <></> : <kit.KitIcon name="user" tone="muted" decorative /> : undefined;
  const badge = dues && <kit.KitTrail kind="badge" part="dues" tone={dues.tone} value={dues.label} density={density} />;
  return <kit.KitRow item={row.id} part={null} label={row.name} density={density}>
    <kit.KitRow part={loading ? null : "root"} label={loading ? "" : row.name}
      goto={loading ? undefined : row.goto} inline density={density}
      lineRole="heading" leading={photo} leadingWidth="avatar" leadingAlign={row.photo ? "row" : "line"}
      trailing={badge}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density}
        content={[["heading", row.name], ["label", row.roles[0]], ["label", otherRoles],
          ["label", joined], ["label", ended], ["label", voting]]} /> : <kit.KitContent density={density}>
        <kit.KitText part="name" role="heading" emphasis="strong" density={density}>{row.name}</kit.KitText>
        {row.roles[0] && <kit.KitText part="role" role="label" tone="muted">{row.roles[0]}</kit.KitText>}
        {otherRoles && <kit.KitText part="other_roles" role="label" tone="muted">{otherRoles}</kit.KitText>}
        {joined && <kit.KitText part="joined" role="label" tone="muted">{joined}</kit.KitText>}
        {ended && <kit.KitText part="ended" role="label" tone="muted">{ended}</kit.KitText>}
        <kit.KitText part="voting_rights" role="label" tone="muted">{voting}</kit.KitText>
      </kit.KitContent>}
    </kit.KitRow>
    {!loading && row.can_end && <kit.KitAction part="end" action="press" kind="danger" label={w.end} />}
  </kit.KitRow>;
}

// prettier-ignore
export function Members(input: View) {
  const state = kit.useComponentState();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const { members } = kit.useLiveControls(meta, input) as { members: Row[] };
  const { words: { members: w } } = kit.useWords(communityWordsFor);
  return <kit.KitCard part="root" density={density}>
    {state === "empty" ? <kit.KitEmpty part="empty" icon="users" decorativeIcon />
      : state === "success" || state === "error"
        ? <kit.KitRow label={state === "success" ? w.saved : w.error} density={density}>
          <kit.KitText part={null} role="heading" tone={state === "success" ? "good" : "bad"}>
            {state === "success" ? w.saved : w.error}
          </kit.KitText>
        </kit.KitRow>
        : members.map((row) => <MemberRow key={row.id} row={row} density={density} loading={state === "loading"} />)}
  </kit.KitCard>;
}

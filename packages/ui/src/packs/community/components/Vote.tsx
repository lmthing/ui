import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
// prettier-ignore
import { previewVote, projectVote, validVoteShape, voteBallot, voteCandidate, voteFacts, voteReading, voteRecordKind, voteRule, voteWake, type VoteFacts } from "../copy";
import { dateTime, ref, seedDate, seedTitle } from "../seeds";
import * as layout from "./vote-layout";

// Core first: Choice/default collects a preference, not a binding motion with quorum and a passing rule.
// prettier-ignore
export const meta = {
  id: "Vote",
  status: "ready",
  group: "input",
  purpose: "Decide a formal motion with member ballots, quorum and a passing rule.",
  pick: "A binding group motion with eligible voters, for/against/abstain ballots, quorum and a passing rule. Not a personal choice (Choice), an opinion poll (Poll), a date search (FindDate) or manager approval (Approval).",
  writeHints: [
    "Use unique snake_case ids. Opens and closes need ISO datetimes with offsets, opens earlier than closes. Seed at most one ballot per eligible member; never write counts or a decision.",
    'Choose rule "majority", "two_thirds" or "unanimous". Use style "result" only for a read-only closed result.',
    "Use voteId for the stored motion reference; the screen instance id is separate.",
    'Use arrange "rows" only when asked to stack choices one per line. Otherwise use arrange:null. Leave density and surface null unless a density or surface is explicitly requested. In particular, stacked choices do not request surface "card". Do not copy the example detail.',
    'Keep the usual motion style as "ballot" or null; use "motion" for an explicitly requested motion style. Use "election" to fill named seats. Only for elections, write candidates as {id,name} and seats 1–5 when specified. An election ballot choice is an array of up to seats candidate IDs or the string "abstain". A motion ballot choice is "for", "against" or "abstain".',
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath:
    "A shared app snapshots eligible voters at opening, accepts one replaceable ballot per member and freezes the decision at closing.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], arrange: ["grid", "rows"] },
  parts: [
    "root", "motion", "detail", "opens", "closes", "quorum", "rule", "participation", "status",
    "decision", "own", "for", "for_label", "against", "against_label", "abstain", "abstain_label",
    "cancel", "cancel_label", "seats",
  ],
  items: { key: "candidateEntries", parts: ["root", "label", "count", "elected"], addressedWhen: { style: "election" } },
  states: ["filled", "loading", "success", "error"],
  actions: {
    parts: { for: ["select"], against: ["select"], abstain: ["select"], cancel: ["press"] },
    items: { root: ["select"] },
    when: {
      for: { motion_ballot: true, can_vote: true },
      against: { motion_ballot: true, can_vote: true },
      abstain: { can_vote: true },
      cancel: { can_cancel: true },
      root: { style: "election", can_vote: true, can_select: true },
    },
  },
  confirmParts: ["cancel"],
  select: { prop: "own_ballot", value: { field: "candidateId" }, parts: { for: "for", against: "against", abstain: "abstain" } },
  deviceData: [voteRecordKind],
  previewDeviceData: previewVote,
  deviceDataWake: voteWake,
  recordRuntime: { kind: voteRecordKind, scope: "voteId", project: projectVote },
  // Declare the projected gate so the runtime revalidates a pending confirmation against the host.
  deviceDataFlags: { can_cancel: (_data, props) => props.can_cancel === true },
  readSuccess: true,
  read: voteReading,
} as const satisfies c.Meta;

// prettier-ignore
export const props = z.strictObject({
    ...c.variantProps(meta.variants), voteId: ref, motion: c.text(120), detail: c.text(240).optional(),
    opens: dateTime, closes: dateTime, quorum: z.int().min(1).max(30), rule: voteRule,
    ballots: z.array(voteBallot).min(0).max(30), cancelled: z.boolean().default(false),
    style: z.enum(["ballot", "result", "motion", "election"]).default("ballot"),
    candidates: z.array(voteCandidate).min(1).max(12).optional(), seats: z.int().min(1).max(5).optional(),
  })
  .refine(({ opens, closes }) => Date.parse(opens) < Date.parse(closes), { path: ["closes"] })
  // Eligibility, opening time and chair permissions must come from the shared host, not the seed.
  .refine(validVoteShape, { path: ["ballots"], message: "Candidates, seats and ballots must agree with the vote style." })
  .overwrite((input) => c.stampItemIds(meta, {
    ...input, candidateEntries: (input.candidates ?? []).map((row) => ({ ...row, candidateId: row.id, label: row.name })),
  }));

// prettier-ignore
export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    voteId: "item_1", motion: seedTitle(input, 120),
    opens: `${seedDate}T09:00:00Z`, closes: `${seedDate}T10:00:00Z`,
    quorum: 1, rule: "majority", ballots: [],
  };
}

// prettier-ignore
export const examples = [
  {
    voteId: "shed", motion: "Buy a shared tool shed",
    detail: "Set aside up to £450 from the plant club’s maintenance fund.",
    opens: "2026-11-18T19:00:00+00:00", closes: "2026-11-18T20:00:00+00:00",
    quorum: 8, rule: "majority",
    ballots: [
      { memberId: "ana", choice: "for" }, { memberId: "cal", choice: "abstain" },
      { memberId: "lee", choice: "against" }, { memberId: "jo", choice: "for" },
    ],
  },
  {
    style: "result", voteId: "walking_route", motion: "Adopt the winter walking route",
    detail: "Meet at the river gate for morning walks.",
    opens: "2026-11-16T18:00:00+00:00", closes: "2026-11-16T19:00:00+00:00",
    quorum: 4, rule: "majority",
    ballots: [
      { memberId: "ana", choice: "for" }, { memberId: "cal", choice: "abstain" },
      { memberId: "lee", choice: "against" }, { memberId: "jo", choice: "for" },
    ],
  },
  {
    style: "result", voteId: "hall",
    motion: "Renew the rehearsal hall lease",
    opens: "2026-10-08T18:00:00+01:00", closes: "2026-10-08T19:00:00+01:00",
    quorum: 2, rule: "two_thirds", cancelled: false,
    ballots: [{ memberId: "lee", choice: "against" }, { memberId: "cal", choice: "abstain" }],
  },
  {
    voteId: "hours", motion: "Extend weekend garden hours", style: "ballot",
    opens: "2026-11-18T19:00:00+00:00", closes: "2026-11-18T20:00:00+00:00",
    quorum: 8, rule: "unanimous", ballots: [], cancelled: true,
  },
  {
    style: "election", voteId: "garden_board", motion: "Elect the garden board",
    opens: "2026-11-18T19:00:00Z", closes: "2026-11-18T20:00:00Z", quorum: 4, rule: "majority",
    candidates: [{ id: "ana", name: "Ana Reed" }, { id: "lee", name: "Lee Ortiz" }, { id: "jo", name: "Jo Bell" }],
    seats: 2, ballots: [{ memberId: "cal", choice: ["ana"] }],
  },
  {
    style: "election", voteId: "walk_board", motion: "Elect the walking club board",
    opens: "2026-11-18T19:00:00Z", closes: "2026-11-18T20:00:00Z", quorum: 3, rule: "majority",
    candidates: [{ id: "lee", name: "Lee Ortiz" }, { id: "jo", name: "Jo Bell" }, { id: "cal", name: "Cal Webb" }],
    seats: 2, ballots: [
      { memberId: "ana", choice: ["lee", "jo"] }, { memberId: "lee", choice: ["lee", "jo"] }, { memberId: "jo", choice: ["jo"] },
    ],
  },
  {
    style: "motion", voteId: "garden_hours", motion: "Extend morning garden hours",
    opens: "2026-11-18T19:00:00Z", closes: "2026-11-18T20:00:00Z", quorum: 8, rule: "majority", ballots: [],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Vote");
// prettier-ignore
export const probes = [
  choose("Let eligible members cast for, against or abstain on a binding shed-purchase motion. It needs quorum and a majority after closing."),
  choose("Let me pick one of three personal reminder plans, each with a short explanation. No shared results.", "Choice"),
  write("Open our formal motion shed, Buy a shared tool shed, from 2026-11-18T19:00:00Z to 2026-11-18T20:00:00Z. Quorum 8, simple majority, no ballots yet."),
  {
    ...write("Open the motion called shed, Buy a shared tool shed, on 18 November 2026 from 19:00 to 20:00 UTC. Quorum 8, simple majority, no ballots yet. Stack For, Against and Abstain vertically, one option on each line. Leave spacing and card treatment to the app."),
    variant: { axis: "arrange", value: "rows" },
  },
  { ...write('Create a for, against or abstain vote called shed with explicit style "motion": Buy a shed, open 18 November 2026 19:00–20:00 UTC, quorum 8, simple majority, no ballots.'),
    expectProps: { style: "motion" } },
  { ...write("Create a committee election called board for 18 November 2026, 19:00–20:00 UTC, quorum 4, simple majority, no ballots yet. The only two candidates are ana (Ana Reed) and lee (Lee Ortiz)."),
    expectProps: { style: "election", candidates: [{ id: "ana", name: "Ana Reed" }, { id: "lee", name: "Lee Ortiz" }] } },
  { ...write("Elect two board members in the board election, 18 November 2026 19:00–20:00 UTC, quorum 4, simple majority. Three candidates: Ana Reed (ana), Lee Ortiz (lee) and Jo Bell (jo). Set two seats. Cal's ballot approves both Ana and Lee."),
    expectProps: { style: "election", seats: 2, ballots: [{ memberId: "cal", choice: ["ana", "lee"] }] } },
  read("Cast my ballot in favour of buying the tool shed.", { address: "v1/for", action: "select" }),
] satisfies c.Probe[];

export function Vote(input: c.Props<typeof props, typeof meta>) {
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const arrange = kit.useVariant("arrange", meta.variants.arrange, input.arrange);
  const live = kit.useLiveControls(meta, input);
  const facts = live.phase ? (live as VoteFacts) : voteFacts(input, c.emptyDeviceData, Date.now());
  return (
    <layout.VoteLayout
      {...{ density, surface, arrange, facts }}
      motion={input.motion}
      detail={input.detail}
    />
  );
}

import { z } from "zod";
import * as c from "../../../catalog";
import { dateTime, distinct, ref, seedDate, seedTitle } from "../seeds";

// Core first: Choice/default collects a preference, not a binding motion with quorum and a passing rule.
export const meta = {
  id: "Vote",
  status: "draft",
  group: "input",
  purpose: "Decide a formal motion with member ballots, quorum and a passing rule.",
  pick: "A formal group motion with eligible members, for/against/abstain ballots, quorum and a passing rule. Not a personal choice (Choice), an opinion poll (Poll), a date search (FindDate) or manager approval (Approval).",
  writeHints: [
    "Use unique snake_case ids. Opens and closes need ISO datetimes with offsets, opens earlier than closes. Seed at most one ballot per eligible member; never write counts or a decision.",
    'Choose rule "majority", "two_thirds" or "unanimous". Use style "result" only for a read-only closed result.',
    "Use voteId for the stored motion reference; the screen instance id is separate.",
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath:
    "A shared app snapshots eligible voters at opening, accepts one replaceable ballot per member and freezes the decision at closing.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: [
    "root",
    "motion",
    "detail",
    "opens",
    "closes",
    "quorum",
    "rule",
    "participation",
    "decision",
    "for",
    "against",
    "abstain",
    "cancel",
  ],
  states: ["filled", "loading", "success", "error"],
  actions: {
    parts: { for: ["select"], against: ["select"], abstain: ["select"], cancel: ["press"] },
    when: {
      for: { style: "ballot", cancelled: false, can_vote: true },
      against: { style: "ballot", cancelled: false, can_vote: true },
      abstain: { style: "ballot", cancelled: false, can_vote: true },
      cancel: { style: "ballot", cancelled: false, can_cancel: true },
    },
  },
  confirmParts: ["cancel"],
  select: { prop: "own_ballot", parts: { for: "for", against: "against", abstain: "abstain" } },
} as const satisfies c.Meta;

const choices = ["for", "against", "abstain"] as const;
const ballot = z.strictObject({ memberId: ref, choice: z.enum(choices) });
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    voteId: ref,
    motion: c.text(120),
    detail: c.text(240).optional(),
    opens: dateTime,
    closes: dateTime,
    quorum: z.int().min(1).max(30),
    rule: z.enum(["majority", "two_thirds", "unanimous"]),
    ballots: z.array(ballot).min(0).max(30),
    cancelled: z.boolean().default(false),
    style: z.enum(["ballot", "result"]).default("ballot"),
  })
  .refine(({ opens, closes }) => Date.parse(opens) < Date.parse(closes), { path: ["closes"] })
  .refine(({ ballots }) => distinct(ballots, (row) => row.memberId), { path: ["ballots"] })
  // The draft previews the ballot face; the shared host must supply time and eligibility gates.
  .overwrite((input) => ({ ...input, can_vote: input.style === "ballot" }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    voteId: "item_1",
    motion: seedTitle(input, 120),
    opens: `${seedDate}T09:00:00Z`,
    closes: `${seedDate}T10:00:00Z`,
    quorum: 1,
    rule: "majority",
    ballots: [],
  };
}

export const examples: z.input<typeof props>[] = [
  {
    voteId: "shed",
    motion: "Buy a shared tool shed",
    detail: "Set aside up to 450 from the maintenance fund.",
    opens: "2026-11-18T19:00:00+00:00",
    closes: "2026-11-18T20:00:00+00:00",
    quorum: 8,
    rule: "majority",
    ballots: [{ memberId: "ana", choice: "for" }],
  },
  {
    density: "compact",
    surface: "outlined",
    style: "result",
    voteId: "hall",
    motion: "Renew the rehearsal hall lease",
    opens: "2026-10-08T18:00:00+01:00",
    closes: "2026-10-08T19:00:00+01:00",
    quorum: 2,
    rule: "two_thirds",
    ballots: [
      { memberId: "lee", choice: "against" },
      { memberId: "cal", choice: "abstain" },
    ],
    cancelled: false,
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Vote");
export const probes = [
  choose(
    "Let eligible members cast for, against or abstain on a binding shed-purchase motion. It needs quorum and a majority after closing.",
  ),
  choose(
    "Let me pick one of three personal reminder plans, each with a short explanation. No shared results.",
    "Choice",
  ),
  write(
    "Open our formal motion shed, Buy a shared tool shed, from 2026-11-18T19:00:00Z to 2026-11-18T20:00:00Z. Quorum 8, simple majority, no ballots yet.",
  ),
  read("Cast my ballot in favour of buying the tool shed.", { address: "v1/for", action: "select" }),
] satisfies c.Probe[];

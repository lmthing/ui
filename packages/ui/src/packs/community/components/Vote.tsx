import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { previewVote, projectVote, voteBallot, voteCopy, voteFacts, voteReading } from "../copy";
import { voteRecordKind, voteRule, voteWake, type VoteFacts } from "../copy";
import { communityWordsFor } from "../lang";
import { dateTime, distinct, ref, seedDate, seedTitle } from "../seeds";

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
    'Use arrange "rows" only when asked to stack choices one per line. Otherwise use arrange:null. Use null for unrequested density, surface and detail. Do not copy a description from the example.',
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
    "cancel", "cancel_label",
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
    style: z.enum(["ballot", "result"]).default("ballot"),
  })
  .refine(({ opens, closes }) => Date.parse(opens) < Date.parse(closes), { path: ["closes"] })
  // Eligibility, opening time and chair permissions must come from the shared host, not the seed.
  .refine(({ ballots }) => distinct(ballots, (row) => row.memberId), { path: ["ballots"] });

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
  read("Cast my ballot in favour of buying the tool shed.", { address: "v1/for", action: "select" }),
] satisfies c.Probe[];

type Copy = ReturnType<typeof voteCopy>;
type Layout = { density: c.ThemeDensity; arrange: (typeof meta.variants.arrange)[number] };
// prettier-ignore
function BallotChoices({ copy, facts, density, arrange, loading }: Layout & { copy: Copy; facts: VoteFacts; loading: boolean }) {
  return <kit.KitGrid columns={3} list={arrange === "rows"} listRowGap="cards" {...{ arrange, density }}>
    {copy.counts.map(({ choice, label, count }) => loading ?
      <kit.KitSkeleton key={choice} shape="control" label={label} full /> : facts.decision ?
      <kit.KitContent key={choice} density={density}>
        <kit.KitText part={`${choice}_label`} role="label" tone="muted">{label}</kit.KitText>
        <kit.KitText part={choice} role="number" numberScale="compact" emphasis="strong" tabular>{count}</kit.KitText>
      </kit.KitContent> :
      <kit.KitChip key={choice} item="" part={choice} labelPart={`${choice}_label`} role="radio"
        look="box" label={label} on={facts.own_ballot === choice} />)}
  </kit.KitGrid>;
}

// prettier-ignore
function Quorum({ copy, facts, density, loading, label }: {
  copy: Copy; facts: VoteFacts; density: c.ThemeDensity; loading: boolean; label: string;
}) {
  const ratio = facts.participation / facts.quorum;
  return <kit.KitRow part={loading ? null : "quorum"} label={label} inline density={density}>
    <kit.KitGrid fitLast density={density}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["label", label]]} />
        : <kit.KitText part={null} role="label">{label}</kit.KitText>}
      {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["body", copy.participation]]} />
        : <kit.KitText part="participation" role="label" tone="muted">
          {copy.quorumRuns.map((run, index) => typeof run === "string" ? run :
            <kit.KitText key={index} part={null} role="number" numberScale="compact" emphasis="strong" tabular>{run.number}</kit.KitText>)}
        </kit.KitText>}
    </kit.KitGrid>
    <kit.KitMeter label="" amount="" ratio={loading ? 0 : ratio} tone={ratio >= 1 ? "good" : "accent"} addressed={false} slim />
  </kit.KitRow>;
}

// prettier-ignore
export function Vote(input: c.Props<typeof props, typeof meta>) {
  const state = kit.useComponentState(), loading = state === "loading";
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const arrange = kit.useVariant("arrange", meta.variants.arrange, input.arrange);
  const { lang, words: { vote: w } } = kit.useWords(communityWordsFor);
  const live = kit.useLiveControls(meta, input);
  const facts = live.phase ? live as VoteFacts : voteFacts(input, c.emptyDeviceData, Date.now());
  const copy = voteCopy(facts, state, lang);
  const ballot = facts.can_vote && (loading || state === "filled");
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["heading", input.motion], ["body", input.detail]]} />
      : <kit.KitContent density={density}>
        <kit.KitText part="motion" role="heading" emphasis="strong">{input.motion}</kit.KitText>
        {input.detail && <kit.KitText part="detail" role="body" tone="muted">{input.detail}</kit.KitText>}
      </kit.KitContent>}
    <kit.KitContent group="response" density={density}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" density={density}
        content={[["label", copy.status], ["label", copy.opens], ["label", copy.closes], ["label", copy.rule]]} /> : <>
        <kit.KitText part="status" role="label" tone={state === "error" ? "bad" : state === "success" ? "good" : "muted"}>{copy.status}</kit.KitText>
        {(["opens", "closes", "rule"] as const).map((part) =>
          <kit.KitText key={part} part={part} role="label" tone="muted">{copy[part]}</kit.KitText>)}
      </>}
    </kit.KitContent>
    <kit.KitContent density={density}>
      <Quorum label={w.quorum} {...{ copy, facts, density, loading }} />
      {copy.decision && <kit.KitText part={loading ? null : "decision"} role="body" emphasis="strong"
        tone={facts.decision === "passed" ? "good" : "muted"}>{copy.decision}</kit.KitText>}
    </kit.KitContent>
    {(ballot || copy.decision || copy.own) && <kit.KitContent density={density}>
      {copy.own && (loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["label", copy.own]]} />
        : <kit.KitText part="own" role="label" tone="muted">{copy.own}</kit.KitText>)}
      {(ballot || copy.decision) && <BallotChoices {...{ copy, facts, density, arrange, loading }} />}
    </kit.KitContent>}
    {facts.can_cancel && (loading || state === "filled") && <kit.KitContent group="response" density={density}>
      {loading ? <kit.KitSkeleton shape="control" kind="danger" label={w.cancel} full />
        : <kit.KitAction part="cancel" action="press" kind="danger" label={w.cancel} full />}
    </kit.KitContent>}
  </kit.KitCard>;
}

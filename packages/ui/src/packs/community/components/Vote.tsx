import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import {
  previewVote,
  projectVote,
  validVoteShape,
  voteBallot,
  voteCandidate,
  voteCopy,
  voteFacts,
  voteReading,
  voteRecordKind,
  voteRule,
  voteWake,
  type VoteFacts,
} from "../copy";
import { communityWordsFor } from "../lang";
import { dateTime, ref, seedDate, seedTitle } from "../seeds";
import { prompt } from "../../../entry/prompt-Vote.generated";

// Core first: Choice/default collects a preference, not a binding motion with quorum and a passing rule.
export const meta = {
  id: "Vote",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "people",
  realPath:
    "A shared app snapshots eligible voters at opening, accepts one replaceable ballot per member and freezes the decision at closing.",
  variants: { arrange: ["grid", "rows"] },
  parts: [
    "root",
    "motion",
    "detail",
    "opens",
    "closes",
    "quorum",
    "rule",
    "participation",
    "status",
    "decision",
    "own",
    "for",
    "for_label",
    "against",
    "against_label",
    "abstain",
    "abstain_label",
    "cancel",
    "cancel_label",
    "seats",
  ],
  items: {
    key: "candidateEntries",
    parts: ["root", "label", "count", "elected"],
    addressedWhen: { style: "election" },
  },
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
  select: {
    prop: "own_ballot",
    value: { field: "candidateId" },
    parts: { for: "for", against: "against", abstain: "abstain" },
  },
  deviceData: [voteRecordKind],
  previewDeviceData: previewVote,
  deviceDataWake: voteWake,
  recordRuntime: { kind: voteRecordKind, scope: "voteId", project: projectVote },
  // Declare the projected gate so the runtime revalidates a pending confirmation against the host.
  deviceDataFlags: { can_cancel: (_data, props) => props.can_cancel === true },
  readSuccess: true,
  read: voteReading,
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    voteId: ref,
    motion: c.text(120),
    detail: c.text(240).optional(),
    opens: dateTime,
    closes: dateTime,
    quorum: z.int().min(1).max(30),
    rule: voteRule,
    ballots: z.array(voteBallot).min(0).max(30),
    cancelled: z.boolean().default(false),
    style: z.enum(["ballot", "result", "motion", "election"]).default("ballot"),
    candidates: z.array(voteCandidate).min(1).max(12).optional(),
    seats: z.int().min(1).max(5).optional(),
  })
  .refine(({ opens, closes }) => Date.parse(opens) < Date.parse(closes), { path: ["closes"] })
  // Eligibility, opening time and chair permissions must come from the shared host, not the seed.
  .refine(validVoteShape, {
    path: ["ballots"],
    message: "Candidates, seats and ballots must agree with the vote style.",
  })
  .overwrite((input) =>
    c.stampItemIds(meta, {
      ...input,
      candidateEntries: (input.candidates ?? []).map((row) => ({
        ...row,
        candidateId: row.id,
        label: row.name,
      })),
    }),
  );

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

export const examples = [
  {
    voteId: "shed",
    motion: "Buy a shared tool shed",
    detail: "Set aside up to £450 from the plant club’s maintenance fund.",
    opens: "2026-11-18T19:00:00+00:00",
    closes: "2026-11-18T20:00:00+00:00",
    quorum: 8,
    rule: "majority",
    ballots: [
      { memberId: "ana", choice: "for" },
      { memberId: "cal", choice: "abstain" },
      { memberId: "lee", choice: "against" },
      { memberId: "jo", choice: "for" },
    ],
  },
  {
    style: "result",
    voteId: "walking_route",
    motion: "Adopt the winter walking route",
    detail: "Meet at the river gate for morning walks.",
    opens: "2026-11-16T18:00:00+00:00",
    closes: "2026-11-16T19:00:00+00:00",
    quorum: 4,
    rule: "majority",
    ballots: [
      { memberId: "ana", choice: "for" },
      { memberId: "cal", choice: "abstain" },
      { memberId: "lee", choice: "against" },
      { memberId: "jo", choice: "for" },
    ],
  },
  {
    style: "result",
    voteId: "hall",
    motion: "Renew the rehearsal hall lease",
    opens: "2026-10-08T18:00:00+01:00",
    closes: "2026-10-08T19:00:00+01:00",
    quorum: 2,
    rule: "two_thirds",
    cancelled: false,
    ballots: [
      { memberId: "lee", choice: "against" },
      { memberId: "cal", choice: "abstain" },
    ],
  },
  {
    voteId: "hours",
    motion: "Extend weekend garden hours",
    style: "ballot",
    opens: "2026-11-18T19:00:00+00:00",
    closes: "2026-11-18T20:00:00+00:00",
    quorum: 8,
    rule: "unanimous",
    ballots: [],
    cancelled: true,
  },
  {
    style: "election",
    voteId: "garden_board",
    motion: "Elect the garden board",
    opens: "2026-11-18T19:00:00Z",
    closes: "2026-11-18T20:00:00Z",
    quorum: 4,
    rule: "majority",
    candidates: [
      { id: "ana", name: "Ana Reed" },
      { id: "lee", name: "Lee Ortiz" },
      { id: "jo", name: "Jo Bell" },
    ],
    seats: 2,
    ballots: [{ memberId: "cal", choice: ["ana"] }],
  },
  {
    style: "election",
    voteId: "walk_board",
    motion: "Elect the walking club board",
    opens: "2026-11-18T19:00:00Z",
    closes: "2026-11-18T20:00:00Z",
    quorum: 3,
    rule: "majority",
    candidates: [
      { id: "lee", name: "Lee Ortiz" },
      { id: "jo", name: "Jo Bell" },
      { id: "cal", name: "Cal Webb" },
    ],
    seats: 2,
    ballots: [
      { memberId: "ana", choice: ["lee", "jo"] },
      { memberId: "lee", choice: ["lee", "jo"] },
      { memberId: "jo", choice: ["jo"] },
    ],
  },
  {
    style: "motion",
    voteId: "garden_hours",
    motion: "Extend morning garden hours",
    opens: "2026-11-18T19:00:00Z",
    closes: "2026-11-18T20:00:00Z",
    quorum: 8,
    rule: "majority",
    ballots: [],
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
  {
    ...write(
      "Open the motion called shed, Buy a shared tool shed, on 18 November 2026 from 19:00 to 20:00 UTC. Quorum 8, simple majority, no ballots yet. Stack For, Against and Abstain vertically, one option on each line. Leave spacing and card treatment to the app.",
    ),
    variant: { axis: "arrange", value: "rows" },
  },
  {
    ...write(
      'Create a for, against or abstain vote called shed with explicit style "motion": Buy a shed, open 18 November 2026 19:00–20:00 UTC, quorum 8, simple majority, no ballots.',
    ),
    expectProps: { style: "motion" },
  },
  {
    ...write(
      "Create a committee election called board for 18 November 2026, 19:00–20:00 UTC, quorum 4, simple majority, no ballots yet. The only two candidates are ana (Ana Reed) and lee (Lee Ortiz).",
    ),
    expectProps: {
      style: "election",
      candidates: [
        { id: "ana", name: "Ana Reed" },
        { id: "lee", name: "Lee Ortiz" },
      ],
    },
  },
  {
    ...write(
      "Elect two board members in the board election, 18 November 2026 19:00–20:00 UTC, quorum 4, simple majority. Three candidates: Ana Reed (ana), Lee Ortiz (lee) and Jo Bell (jo). Set two seats. Cal's ballot approves both Ana and Lee.",
    ),
    expectProps: { style: "election", seats: 2, ballots: [{ memberId: "cal", choice: ["ana", "lee"] }] },
  },
  read("Cast my ballot in favour of buying the tool shed.", { address: "v1/for", action: "select" }),
] satisfies c.Probe[];

export function Vote(input: c.Props<typeof props, typeof meta>) {
  const density = kit.useKit().density;
  const surface = "card";
  const arrange = kit.useVariant("arrange", meta.variants.arrange, input.arrange);
  const live = kit.useLiveControls(meta, input);
  const facts = live.phase ? (live as VoteFacts) : voteFacts(input, c.emptyDeviceData, Date.now());
  return <VoteLayout {...{ density, surface, arrange, facts }} motion={input.motion} detail={input.detail} />;
}

type Copy = ReturnType<typeof voteCopy>;
type Density = c.ThemeDensity;
type Arrange = "grid" | "rows";

function Quorum({
  copy,
  facts,
  density,
  loading,
  label,
}: {
  copy: Copy;
  facts: VoteFacts;
  density: Density;
  loading: boolean;
  label: string;
}) {
  const ratio = facts.participation / facts.quorum;
  return (
    <kit.KitRow part={loading ? null : "quorum"} label={label} inline fitContent density={density}>
      <kit.KitGrid fitLast density={density}>
        <kit.KitLayoutText density={density} line={{ text: label, role: "meta", strong: true }} />
        <kit.KitLayoutText
          density={density}
          align="end"
          line={{ text: copy.participation, part: "participation", role: "meta", tabular: true }}
        />
      </kit.KitGrid>
      <kit.KitMeter
        label=""
        amount=""
        ratio={loading ? 0 : ratio}
        tone={ratio >= 1 ? "good" : "accent"}
        addressed={false}
        slim
      />
    </kit.KitRow>
  );
}

function MotionChoices({
  copy,
  facts,
  density,
  arrange,
  voting,
}: {
  copy: Copy;
  facts: VoteFacts;
  density: Density;
  arrange: Arrange;
  voting: boolean;
}) {
  if (copy.decision)
    return (
      <kit.KitRowGroup density={density}>
        {copy.counts.map(({ choice, label, count }) => (
          <kit.KitRow key={choice} part={null} label={label} inset="none" density={density}>
            <kit.KitGrid fitLast density={density}>
              <kit.KitLayoutText
                density={density}
                line={{ text: label, part: `${choice}_label`, role: "meta" }}
              />
              <kit.KitLayoutText
                density={density}
                align="end"
                line={{ text: count, part: choice, role: "figure", compact: true, tabular: true }}
              />
            </kit.KitGrid>
          </kit.KitRow>
        ))}
      </kit.KitRowGroup>
    );
  if (!voting) return null;
  return (
    <kit.KitGrid columns={3} list={arrange === "rows"} listRowGap="cards" {...{ arrange, density }}>
      {copy.counts.map(({ choice, label }) => (
        <kit.KitChip
          key={choice}
          item=""
          part={choice}
          labelPart={`${choice}_label`}
          role="radio"
          look="box"
          label={label}
          on={facts.own_ballot === choice}
        />
      ))}
    </kit.KitGrid>
  );
}

function ElectionChoices({
  copy,
  facts,
  voting,
  density,
  arrange,
  abstain,
  elected,
}: {
  copy: NonNullable<Copy["election"]>;
  facts: VoteFacts;
  voting: boolean;
  density: Density;
  arrange: Arrange;
  abstain: string;
  elected: string;
}) {
  const scope = kit.usePartContext();
  const loading = kit.useComponentState() === "loading";
  return (
    <kit.KitContent density={density}>
      {voting ? (
        <kit.KitGrid {...{ arrange, density }} columns={2} list listRowGap="cards">
          {copy.rows.map(({ id, name, selected, can_select }) => (
            <kit.KitChip
              key={id}
              item={id}
              role="checkbox"
              look="box"
              label={name}
              on={selected}
              disabled={!can_select}
            />
          ))}
          <kit.KitChip
            item=""
            part="abstain"
            labelPart="abstain_label"
            role="checkbox"
            look="box"
            label={abstain}
            on={facts.election?.abstained === true}
          />
        </kit.KitGrid>
      ) : (
        ElectionResults(copy.rows, scope, loading, density, elected)
      )}
    </kit.KitContent>
  );
}

function ElectionResults(
  rows: NonNullable<Copy["election"]>["rows"],
  scope: ReturnType<typeof kit.usePartContext>,
  loading: boolean,
  density: Density,
  elected: string,
) {
  return (
    <kit.KitRowGroup density={density}>
      {rows.map(({ id, name, countText, elected: won }) => (
        <kit.PartScope key={id} {...scope} item={id}>
          <kit.KitRow part={loading ? null : "root"} label={name} inline fitContent>
            <kit.KitGrid density={density}>
              <kit.KitMetaLine
                density={density}
                title={{ text: name, part: "label" }}
                meta={{ text: won ? elected : undefined, part: "elected", tone: "good" }}
              />
              <kit.KitLayoutText
                density={density}
                align="end"
                line={{ text: countText, part: "count", role: "figure", compact: true, tabular: true }}
              />
            </kit.KitGrid>
          </kit.KitRow>
        </kit.PartScope>
      ))}
    </kit.KitRowGroup>
  );
}

type VoteSummaryProps = {
  motion: string;
  detail: string | undefined;
  copy: Copy;
  density: Density;
  state: c.StateName;
  resolved: boolean;
};

function VoteSummary({ motion, detail, copy, density, state, resolved }: VoteSummaryProps) {
  const alert = state === "error" && (
    <kit.KitEmpty
      title={copy.status}
      part="status"
      tone="bad"
      icon="alert"
      prominence="heading"
      announce="alert"
      decorativeIcon
      density={density}
    />
  );
  const heading = (
    <kit.KitHeader
      density={density}
      title={{ text: motion, part: "motion", role: "body", strong: true }}
      meta={{ text: detail, part: "detail", role: "body" }}
    />
  );
  const status = state === "success" && (
    <kit.KitState part="status" message={copy.status} density={density} />
  );
  const details = (
    <kit.KitContent group="response" density={density}>
      {!resolved && (
        <kit.KitLayoutText
          density={density}
          line={{ text: copy.status, part: "status", role: "meta", strong: true }}
        />
      )}
      {(["opens", "closes", "rule"] as const).map((part) => (
        <kit.KitLayoutText
          key={part}
          density={density}
          line={{ text: copy[part], part, role: "meta", tone: "muted" }}
        />
      ))}
      {copy.election && (
        <kit.KitLayoutText
          density={density}
          line={{ text: copy.election.seats, part: "seats", role: "meta", tone: "muted" }}
        />
      )}
    </kit.KitContent>
  );
  return { alert, heading, status, details };
}

function VoteDecision({
  copy,
  facts,
  density,
  arrange,
  voting,
  words,
}: {
  copy: Copy;
  facts: VoteFacts;
  density: Density;
  arrange: Arrange;
  voting: boolean;
  words: ReturnType<typeof communityWordsFor>["vote"];
}) {
  return (
    (copy.own || voting || copy.decision || copy.election) && (
      <kit.KitContent group="response" density={density}>
        <kit.KitLayoutText
          density={density}
          line={{
            text: copy.decision,
            part: "decision",
            strong: true,
            tone: facts.decision === "passed" ? "good" : "text",
          }}
        />
        <kit.KitLayoutText
          density={density}
          line={{ text: copy.own, part: "own", role: "meta", tone: "muted" }}
        />
        {copy.election ? (
          <ElectionChoices
            copy={copy.election}
            {...{ facts, voting, density, arrange }}
            abstain={words.choice.abstain}
            elected={words.elected}
          />
        ) : (
          <MotionChoices {...{ copy, facts, density, arrange, voting }} />
        )}
      </kit.KitContent>
    )
  );
}

function VoteLayout({
  motion,
  detail,
  facts,
  density,
  surface,
  arrange,
}: {
  motion: string;
  detail?: string | undefined;
  facts: VoteFacts;
  density: Density;
  surface: "card" | "outlined";
  arrange: Arrange;
}) {
  const state = kit.useComponentState();
  const loading = state === "loading";
  const {
    lang,
    words: { vote: w },
  } = kit.useWords(communityWordsFor);
  const copy = voteCopy(facts, state, lang);
  const resolved = state === "success" || state === "error";
  const voting = facts.can_vote && (loading || state === "filled");
  const { alert, heading, status, details } = VoteSummary({ motion, detail, copy, density, state, resolved });
  const content = (
    <>
      {alert}
      {heading}
      {status}
      {details}
      <kit.KitContent group="response" density={density}>
        <Quorum label={w.quorum} {...{ copy, facts, density, loading }} />
      </kit.KitContent>
      {VoteDecision({ copy, facts, density, arrange, voting, words: w })}
      {facts.can_cancel && (loading || state === "filled") && (
        <kit.KitActionFooter align="end" density={density}>
          <kit.KitAction
            part={loading ? null : "cancel"}
            action="press"
            kind="quiet"
            icon="close"
            contentParts={{ label: "cancel_label" }}
            label={copy.election ? w.cancelElection : w.cancel}
          />
        </kit.KitActionFooter>
      )}
    </>
  );
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      {loading ? <kit.KitState loading={content} density={density} /> : content}
    </kit.KitCard>
  );
}

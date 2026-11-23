import { z } from "zod";
import * as c from "../../../catalog";
import { communityWordsFor } from "../lang";
import { dateTime, distinct, ref } from "../seeds";
import {
  electionCopy,
  electionFacts,
  motionChoices,
  validVoteShape,
  voteBallot,
  voteRule,
  type ElectionSeed,
} from "./election";

export { validVoteShape, voteBallot, voteCandidate, voteRule } from "./election";
type Ballot = z.output<typeof voteBallot>;
type Choice = (typeof motionChoices)[number];
type Rule = z.output<typeof voteRule>;
type Schedule = { opens: string; closes: string };
type Motion = Schedule & { quorum: number; rule: Rule; ballots: Ballot[]; cancelled: boolean };
type Seed = Motion & ElectionSeed & { voteId: string; candidateEntries?: ElectionSeed["candidates"] };
type Phase = "scheduled" | "open" | "closed" | "cancelled";
export type VoteFacts = Motion & {
  phase: Phase;
  can_vote: boolean;
  can_cancel: boolean;
  motion_ballot: boolean;
  own_ballot: Choice | undefined;
  counts: Record<Choice, number>;
  participation: number;
  decision?: "passed" | "failed" | "noQuorum";
  election?: ReturnType<typeof electionFacts>;
};

const voteRecordKind = "community_votes";
export { voteRecordKind };
const previewClock = Symbol("votePreviewClock");
const hostRecord = z
  .object({
    voteId: ref,
    opens: dateTime,
    closes: dateTime,
    quorum: z.int().min(1),
    rule: voteRule,
    cancelled: z.boolean(),
    ballots: z.array(voteBallot),
    eligible: z.array(ref),
    chair: ref.optional(),
    viewer: ref.optional(),
  })
  .refine(({ opens, closes }) => Date.parse(opens) < Date.parse(closes))
  .refine(({ ballots, eligible }) => {
    const electorate = new Set(eligible);
    return distinct(ballots, (row) => row.memberId) && ballots.every((row) => electorate.has(row.memberId));
  });

function matchingRecord(data: c.DeviceData, seed: Seed) {
  const rows = data[voteRecordKind]?.filter((row): row is { voteId: string; [previewClock]?: number } =>
    Boolean(row && typeof row === "object" && "voteId" in row && row.voteId === seed.voteId),
  );
  if (rows?.length !== 1) return;
  const result = hostRecord.safeParse(rows[0]);
  if (result.success && validVoteShape({ ...seed, ballots: result.data.ballots }))
    return { ...result.data, sampleTime: rows[0]?.[previewClock] };
}

function phaseOf(motion: Motion, now: number): Phase {
  if (motion.cancelled) return "cancelled";
  if (now < Date.parse(motion.opens)) return "scheduled";
  return now < Date.parse(motion.closes) ? "open" : "closed";
}

function resultOf(rule: Rule, counts: Record<Choice, number>, reached: boolean) {
  if (!reached) return "noQuorum";
  const { for: yes, against: no } = counts;
  const cast = yes + no;
  const passes = rule === "majority" ? yes > no : rule === "two_thirds" ? yes * 3 >= cast * 2 : no === 0;
  return cast > 0 && passes ? "passed" : "failed";
}

export function voteFacts(seed: Seed, data: c.DeviceData, now: number): VoteFacts {
  const record = matchingRecord(data, seed);
  const { opens, closes, cancelled, quorum, rule, ballots } = record ?? seed;
  const motion = { opens, closes, cancelled, quorum, rule, ballots };
  const phase = phaseOf(motion, record?.sampleTime ?? now);
  const closed = phase === "closed",
    reached = ballots.length >= quorum;
  const electing = seed.style === "election";
  const counts = { for: 0, against: 0, abstain: 0 };
  for (const { choice } of ballots) if (!Array.isArray(choice)) counts[choice]++;
  const participation = ballots.length;
  const viewer = record?.viewer;
  const interactive = seed.style !== "result" && Boolean(viewer);
  const own = viewer ? ballots.find((row) => row.memberId === viewer)?.choice : undefined;
  return {
    ...motion,
    phase,
    counts,
    participation,
    can_vote: interactive && phase === "open" && Boolean(record?.eligible.includes(viewer!)),
    can_cancel: interactive && (phase === "open" || phase === "scheduled") && viewer === record?.chair,
    motion_ballot: !electing,
    own_ballot: !electing && typeof own === "string" ? own : undefined,
    ...(electing
      ? {
          election: electionFacts(
            { ...seed, candidates: seed.candidateEntries ?? seed.candidates, ballots },
            rule,
            own,
            closed,
            reached,
          ),
        }
      : {}),
    ...(closed && !electing ? { decision: resultOf(rule, counts, reached) } : {}),
  };
}

export function projectVote({ props, data, now }: Pick<c.RecordContext, "props" | "data" | "now">) {
  const seed = props as Seed,
    facts = voteFacts(seed, data, now);
  return facts.election
    ? {
        ...facts,
        candidateEntries: seed.candidateEntries?.map((row, index) => ({
          ...row,
          can_select: facts.election!.electionRows[index]?.can_select,
        })),
      }
    : facts;
}

export function voteWake(_data: c.DeviceData, props: Readonly<c.Values>, now: number) {
  const { phase, opens, closes } = props as VoteFacts;
  const boundary = phase === "scheduled" ? Date.parse(opens) : phase === "open" ? Date.parse(closes) : now;
  return boundary > now ? boundary : undefined;
}

/** Preview fixtures freeze a sample clock without changing the dates displayed or the live host schema. */
export function previewVote({ input }: { input: Readonly<c.Values> }): c.DeviceData {
  const { voteId, opens, closes, quorum, rule, ballots, cancelled, style } = input as Seed;
  const viewer = ballots[0]?.memberId ?? "viewer";
  return {
    [voteRecordKind]: [
      {
        voteId,
        opens,
        closes,
        quorum,
        rule,
        ballots,
        cancelled,
        eligible: [...new Set([viewer, ...ballots.map((row) => row.memberId)])],
        chair: viewer,
        viewer,
        [previewClock]: Date.parse(
          style === "result" || (style === "election" && ballots.length >= quorum) ? closes : opens,
        ),
      },
    ],
  };
}

function stamp(value: string, lang?: string) {
  return new Intl.DateTimeFormat(c.dateLocaleOf(lang), {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}

export function voteCopy(facts: VoteFacts, state: c.StateName, lang?: string) {
  const w = communityWordsFor(lang).vote;
  const { opens, closes, phase, quorum, participation, own_ballot, decision } = facts;
  const election = facts.election && electionCopy(facts.election, lang);
  const own = election?.own || (own_ballot && w.choice[own_ballot]);
  const quorumRuns = w.participation(c.numberLine(participation, lang), c.numberLine(quorum, lang));
  return {
    status:
      state === "success"
        ? w.saved
        : state === "error"
          ? w.error
          : phase === "cancelled" && election
            ? w.electionCancelled
            : w.phase[phase],
    opens: w.opens(stamp(opens, lang)),
    closes: w.closes(stamp(closes, lang)),
    rule: w.rule[facts.rule],
    quorumRuns,
    participation: quorumRuns.map((run) => (typeof run === "string" ? run : run.number)).join(""),
    decision:
      election && phase === "closed"
        ? participation >= quorum
          ? election.result
          : w.decision.noQuorum
        : decision && w.decision[decision],
    own: own && (state === "error" ? w.recorded : w.own)(own),
    counts: motionChoices.map((choice) => ({
      choice,
      label: w.choice[choice],
      count: c.numberLine(facts.counts[choice], lang),
    })),
    election,
  };
}

export function voteReading(input: unknown, state: c.StateName, lang?: string) {
  const facts = input as VoteFacts;
  const w = communityWordsFor(lang).vote;
  const { status, opens, closes, rule, participation, decision, own, counts, election } = voteCopy(
    facts,
    state,
    lang,
  );
  const voting = facts.can_vote && state === "filled";
  return [
    status,
    opens,
    closes,
    rule,
    w.quorum,
    participation,
    decision,
    own,
    ...(election
      ? [
          election.seats,
          ...election.rows.map(({ id, name, countText, elected }) => {
            const label = countText === undefined ? name : w.count(name, countText);
            const detail = [label, elected && w.elected].filter(Boolean).join(" · ");
            return `${id}: ${detail}`;
          }),
          ...(voting ? [w.choice.abstain] : []),
        ]
      : decision
        ? counts.map(({ label, count }) => w.count(label, count))
        : voting
          ? motionChoices.map((choice) => w.choice[choice])
          : []),
    ...(facts.can_cancel && state === "filled" ? [election ? w.cancelElection : w.cancel] : []),
  ].filter((line): line is string => Boolean(line));
}

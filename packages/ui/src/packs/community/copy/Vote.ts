import { z } from "zod";
import * as c from "../../../catalog";
import { communityWordsFor } from "../lang";
import { dateTime, distinct, ref } from "../seeds";

const voteChoices = ["for", "against", "abstain"] as const;
export const voteBallot = z.strictObject({ memberId: ref, choice: z.enum(voteChoices) });
export const voteRule = z.enum(["majority", "two_thirds", "unanimous"]);
type Ballot = z.output<typeof voteBallot>;
type Choice = Ballot["choice"];
type Rule = z.output<typeof voteRule>;
type Schedule = { opens: string; closes: string };
type Motion = Schedule & { quorum: number; rule: Rule; ballots: Ballot[]; cancelled: boolean };
type Seed = Motion & { voteId: string; style: "ballot" | "result" };
type Phase = "scheduled" | "open" | "closed" | "cancelled";
export type VoteFacts = Motion & {
  phase: Phase;
  can_vote: boolean;
  can_cancel: boolean;
  own_ballot: Choice | undefined;
  counts: Record<Choice, number>;
  participation: number;
  decision?: "passed" | "failed" | "noQuorum";
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

function matchingRecord(data: c.DeviceData, voteId: string) {
  const rows = data[voteRecordKind]?.filter((row): row is { voteId: string; [previewClock]?: number } =>
    Boolean(row && typeof row === "object" && "voteId" in row && row.voteId === voteId),
  );
  if (rows?.length !== 1) return;
  const result = hostRecord.safeParse(rows[0]);
  if (result.success) return { ...result.data, sampleTime: rows[0]?.[previewClock] };
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
  const record = matchingRecord(data, seed.voteId);
  const { opens, closes, cancelled, quorum, rule, ballots } = record ?? seed;
  const motion = { opens, closes, cancelled, quorum, rule, ballots };
  const phase = phaseOf(motion, record?.sampleTime ?? now);
  const counts = { for: 0, against: 0, abstain: 0 };
  for (const { choice } of ballots) counts[choice]++;
  const participation = ballots.length;
  const viewer = record?.viewer;
  const interactive = seed.style === "ballot" && Boolean(viewer);
  return {
    ...motion,
    phase,
    counts,
    participation,
    can_vote: interactive && phase === "open" && Boolean(record?.eligible.includes(viewer!)),
    can_cancel: interactive && (phase === "open" || phase === "scheduled") && viewer === record?.chair,
    own_ballot: viewer ? ballots.find((row) => row.memberId === viewer)?.choice : undefined,
    ...(phase === "closed" ? { decision: resultOf(rule, counts, participation >= quorum) } : {}),
  };
}

export function projectVote({ props, data, now }: Pick<c.RecordContext, "props" | "data" | "now">) {
  return voteFacts(props as Seed, data, now);
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
        [previewClock]: Date.parse(style === "result" ? closes : opens),
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
  const quorumRuns = w.participation(c.numberLine(participation, lang), c.numberLine(quorum, lang));
  return {
    status: state === "success" ? w.saved : state === "error" ? w.error : w.phase[phase],
    opens: w.opens(stamp(opens, lang)),
    closes: w.closes(stamp(closes, lang)),
    rule: w.rule[facts.rule],
    quorumRuns,
    participation: quorumRuns.map((run) => (typeof run === "string" ? run : run.number)).join(""),
    decision: decision && w.decision[decision],
    own: own_ballot && (state === "error" ? w.recorded : w.own)(w.choice[own_ballot]),
    counts: voteChoices.map((choice) => ({
      choice,
      label: w.choice[choice],
      count: c.numberLine(facts.counts[choice], lang),
    })),
  };
}

export function voteReading(input: unknown, state: c.StateName, lang?: string) {
  const facts = input as VoteFacts;
  const w = communityWordsFor(lang).vote;
  const { status, opens, closes, rule, participation, decision, own, counts } = voteCopy(facts, state, lang);
  return [
    status,
    opens,
    closes,
    rule,
    w.quorum,
    participation,
    decision,
    own,
    ...(decision
      ? counts.map(({ label, count }) => w.count(label, count))
      : facts.can_vote && state === "filled"
        ? voteChoices.map((choice) => w.choice[choice])
        : []),
    ...(facts.can_cancel && state === "filled" ? [w.cancel] : []),
  ].filter((line): line is string => Boolean(line));
}

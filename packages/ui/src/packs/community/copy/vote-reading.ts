import * as c from "../../../catalog";
import { communityWordsFor } from "../lang";
import { electionCopy, motionChoices } from "./election";
import type { VoteFacts } from "./Vote";

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
          ...election.rows.map(
            ({ id, name, countText, elected }) =>
              `${id}: ${[countText === undefined ? name : w.count(name, countText), elected && w.elected].filter(Boolean).join(" · ")}`,
          ),
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

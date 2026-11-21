import { dateFormatter } from "../../../catalog";
import { hiringWordsFor, type HiringWords } from "../lang";

type Application = {
  applied: string;
  stage: Exclude<keyof HiringWords["stages"], "saved">;
  outcome: keyof HiringWords["outcomes"];
};
type EvidenceReview = Application & {
  criteria: readonly { label: string; finding: keyof HiringWords["candidate"]["findings"] }[];
};

export function candidateCopy({ applied, stage, outcome }: Application, lang?: string) {
  const words = hiringWordsFor(lang);
  return {
    applied: words.candidate.applied(dateFormatter(lang).format(new Date(`${applied}T00:00:00Z`))),
    stage: words.stages[stage],
    outcome: words.outcomes[outcome],
  };
}

export function candidateReading(input: EvidenceReview, lang?: string) {
  const { applied, stage, outcome } = candidateCopy(input, lang);
  const { candidate } = hiringWordsFor(lang);
  return [
    applied,
    stage,
    outcome,
    ...input.criteria.map(({ label, finding }) => candidate.reviewLine(label, candidate.findings[finding])),
    ...Object.values(candidate.findings),
    ...(input.outcome === "active"
      ? [candidate.interview, candidate.offer, candidate.hire, candidate.reject, candidate.withdraw]
      : Object.values(candidate.history)),
  ];
}
